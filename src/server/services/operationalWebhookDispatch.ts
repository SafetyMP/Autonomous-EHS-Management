import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { operationalWebhookEndpoint } from "@/server/db/schema";
import type { OperationalWebhookEventId } from "@/lib/operationalWebhook/eventTypes";
import { logError, logWarn } from "@/lib/logger";

/** Spec version for consumer parsers; bump when payload envelope changes. */
const WEBHOOK_SPEC_VERSION = 1 as const;

function signPayload(secret: string, rawBodyUtf8: string): string {
  const hmac = createHmac("sha256", secret).update(rawBodyUtf8, "utf8").digest("hex");
  return `sha256=${hmac}`;
}

export function verifyOperationalWebhookSignature(
  secret: string,
  rawBodyUtf8: string,
  signatureHeader: string | null | undefined,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = signPayload(secret, rawBodyUtf8).slice("sha256=".length);
  const provided = signatureHeader.slice("sha256=".length).trim();
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function deliverOne(
  targetUrl: string,
  secret: string | null | undefined,
  envelope: Record<string, unknown>,
): Promise<void> {
  const raw = JSON.stringify(envelope);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-EHS-Delivery": "operational_webhook_v1",
  };
  if (secret) {
    headers["X-EHS-Signature"] = signPayload(secret, raw);
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8500);

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: raw,
      signal: ac.signal,
    });
    if (!res.ok) {
      logWarn("operational_webhook.http_not_ok", {
        targetHost: safeHost(targetUrl),
        status: res.status,
      });
    }
  } finally {
    clearTimeout(t);
  }
}

function safeHost(urlStr: string): string {
  try {
    return new URL(urlStr).host;
  } catch {
    return "invalid-url";
  }
}

/**
 * Fire-and-forget delivery to subscribed org endpoints for a canonical event id.
 */
export async function dispatchOperationalWebhooks(args: {
  db: Db;
  organizationId: string;
  eventType: OperationalWebhookEventId;
  data: Record<string, unknown>;
}): Promise<void> {
  const { db, organizationId, eventType, data } = args;
  let rows;
  try {
    rows = await db
      .select()
      .from(operationalWebhookEndpoint)
      .where(
        and(
          eq(operationalWebhookEndpoint.organizationId, organizationId),
          eq(operationalWebhookEndpoint.enabled, true),
        ),
      );
  } catch (e) {
    logError("operational_webhook.endpoint_load_failed", {
      organizationId,
      eventType,
      message: e instanceof Error ? e.message : String(e),
    });
    return;
  }

  const occurredAt = new Date().toISOString();
  const envelope = {
    specVersion: WEBHOOK_SPEC_VERSION,
    eventType,
    occurredAt,
    organizationId,
    data,
  };

  for (const row of rows) {
    const subscribed = Array.isArray(row.subscribedEvents) ? row.subscribedEvents : [];
    if (!subscribed.includes(eventType)) continue;
    try {
      await deliverOne(row.targetUrl, row.secret ?? null, envelope as Record<string, unknown>);
    } catch (e) {
      logWarn("operational_webhook.deliver_failed", {
        organizationId,
        eventType,
        endpointId: row.id,
        host: safeHost(row.targetUrl),
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }
}
