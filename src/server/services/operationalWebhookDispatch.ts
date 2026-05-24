import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { operationalWebhookEndpoint } from "@/server/db/schema";
import type { OperationalWebhookEventId } from "@/lib/operationalWebhook/eventTypes";
import {
  detectNotificationChannel,
  formatOperationalWebhookBody,
  type OperationalWebhookEnvelope,
} from "@/lib/operationalWebhook/channelAdapters";
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
  envelope: OperationalWebhookEnvelope,
): Promise<void> {
  const channel = detectNotificationChannel(targetUrl);
  const { body, contentType } = formatOperationalWebhookBody(channel, envelope);
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "X-EHS-Delivery": channel === "json" ? "operational_webhook_v1" : `operational_webhook_v1_${channel}`,
  };
  if (secret) {
    headers["X-EHS-Signature"] = signPayload(secret, body);
  }

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8500);

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body,
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
  const envelope: OperationalWebhookEnvelope = {
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
      await deliverOne(row.targetUrl, row.secret ?? null, envelope);
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

/** Org-admin test ping using a subscribed event shape (or integration failure sample). */
export async function deliverOperationalWebhookTest(args: {
  targetUrl: string;
  secret: string | null | undefined;
  organizationId: string;
  subscribedEvents: OperationalWebhookEventId[];
}): Promise<{ channel: ReturnType<typeof detectNotificationChannel> }> {
  const eventType = args.subscribedEvents[0] ?? "integration.processing_failed";
  const data =
    eventType === "integration.processing_failed"
      ? {
          integrationEventId: "00000000-0000-4000-8000-000000009999",
          sourceEventType: "operational_webhook.test",
          processingErrorPreview: "Test delivery from EHS Console — no action required.",
        }
      : { message: "Test delivery from EHS Console — no action required." };

  const envelope: OperationalWebhookEnvelope = {
    specVersion: WEBHOOK_SPEC_VERSION,
    eventType,
    occurredAt: new Date().toISOString(),
    organizationId: args.organizationId,
    data,
  };
  const channel = detectNotificationChannel(args.targetUrl);
  await deliverOne(args.targetUrl, args.secret ?? null, envelope);
  return { channel };
}
