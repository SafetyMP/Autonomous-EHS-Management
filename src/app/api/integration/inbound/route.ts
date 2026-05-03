import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  hrisSyncInputFromInbound,
  inboundIdempotencyKeyFromPayload,
  parseIntegrationInboundPayload,
  trainingIngestInputFromInbound,
} from "@/lib/integration/inboundEnvelope";
import { getJobQueue } from "@/server/jobs/queue";
import { JOB_NAMES } from "@/server/jobs/types";
import { db } from "@/server/db";
import { processHrisMembershipSyncInbound } from "@/server/services/integrationInboundDispatch";
import {
  lookupIntegrationInboundCache,
  storeIntegrationInboundCache,
} from "@/server/services/integrationInboundIdempotencyCache";
import { persistTrainingCompletionEvent } from "@/server/services/trainingCompletionIngest";

/**
 * Inbound integration webhook. Requires `INTEGRATION_INBOUND_SECRET` and
 * `Authorization: Bearer <secret>`.
 *
 * Body: discriminated union with `kind`:
 * - `training_completion` — LMS completion (legacy payloads without `kind` still accepted)
 * - `hris_membership_sync` — assign `membership.siteId` by worker email + org
 *
 * Optional **`idempotencyKey`** on either kind caches the outbound JSON (`200`/`422`) until the row is removed,
 * enabling safe LMS/ERP replays (`integration_inbound_idempotency` table).
 *
 * When **`PG_BOSS_ENABLED=true`**, `hris_membership_sync` returns **`202`** `{ ok: true, queued: true }` and is
 * processed by [`scripts/job-worker.ts`](../../../../scripts/job-worker.ts); optional `idempotencyKey` still dedupes
 * sends (`singletonKey`) and populates the cache after the worker finishes (same shapes as synchronous HRIS).
 */
export async function POST(request: Request) {
  const secret = env.INTEGRATION_INBOUND_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Integration inbound is not configured." },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseIntegrationInboundPayload(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const orgFromPayload = parsed.data.organizationId;
  const idemKey = inboundIdempotencyKeyFromPayload(parsed.data);

  async function persistCache(status: number, body: Record<string, unknown>): Promise<void> {
    if (idemKey) {
      await storeIntegrationInboundCache(db, orgFromPayload, idemKey, status, body);
    }
  }

  try {
    if (idemKey) {
      const cached = await lookupIntegrationInboundCache(db, orgFromPayload, idemKey);
      if (cached) {
        return NextResponse.json(cached.responseJson, { status: cached.httpStatus });
      }
    }

    if (parsed.data.kind === "training_completion") {
      const row = await persistTrainingCompletionEvent(
        db,
        trainingIngestInputFromInbound(parsed.data),
        null,
      );
      const body = { ok: true, id: row.id, processingStatus: "applied" as const };
      await persistCache(200, { ...body });
      return NextResponse.json(body);
    }

    if (env.PG_BOSS_ENABLED === "true") {
      const input = hrisSyncInputFromInbound(parsed.data);
      const singletonKey = idemKey ? `hris_inbound:${orgFromPayload}:${idemKey}` : undefined;
      await getJobQueue().enqueue(
        JOB_NAMES.INTEGRATION_INBOUND_HRIS,
        {
          input,
          idempotencyKey: idemKey ?? null,
        },
        singletonKey ? { singletonKey } : undefined,
      );
      const accept = { ok: true as const, queued: true as const };
      return NextResponse.json(accept, { status: 202 });
    }

    const out = await processHrisMembershipSyncInbound(db, hrisSyncInputFromInbound(parsed.data));
    if (out.processingStatus === "failed") {
      const body = { ok: false, id: out.id, error: out.error ?? "processing_failed" };
      await persistCache(422, { ...body });
      return NextResponse.json(body, { status: 422 });
    }
    const okBody = { ok: true, id: out.id, processingStatus: out.processingStatus };
    await persistCache(200, { ...okBody });
    return NextResponse.json(okBody);
  } catch {
    return NextResponse.json({ error: "Persist failed" }, { status: 500 });
  }
}
