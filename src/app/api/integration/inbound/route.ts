import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import {
  hrisContractorInputFromInbound,
  hrisSyncInputFromInbound,
  inboundIdempotencyKeyFromPayload,
  parseIntegrationInboundPayload,
  trainingIngestInputFromInbound,
} from "@/lib/integration/inboundEnvelope";
import { getJobQueue } from "@/server/jobs/queue";
import { JOB_NAMES } from "@/server/jobs/types";
import { db } from "@/server/db";
import { organization } from "@/server/db/schema";
import {
  processHrisContractorSyncInbound,
  processHrisMembershipSyncInbound,
  processRosterSnapshotInbound,
} from "@/server/services/integrationInboundDispatch";
import {
  lookupIntegrationInboundCache,
  storeIntegrationInboundCache,
} from "@/server/services/integrationInboundIdempotencyCache";
import { persistTrainingCompletionEvent } from "@/server/services/trainingCompletionIngest";

export async function POST(request: Request) {
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
  const [orgRow] = await db
    .select({ secret: organization.integrationInboundSecret })
    .from(organization)
    .where(eq(organization.id, orgFromPayload))
    .limit(1);

  const orgSecret = orgRow?.secret?.trim() ?? "";
  const globalSecret = env.INTEGRATION_INBOUND_SECRET?.trim() ?? "";
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  const authorized =
    (orgSecret.length >= 16 && bearer.length === orgSecret.length && timingSafeEqual(bearer, orgSecret)) ||
    (globalSecret.length >= 16 &&
      bearer.length === globalSecret.length &&
      timingSafeEqual(bearer, globalSecret));

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      const body = {
        ok: true,
        id: row.id,
        processingStatus: "applied" as const,
        trainingRecordId: row.trainingRecordId,
      };
      await persistCache(200, { ...body });
      return NextResponse.json(body);
    }

    if (parsed.data.kind === "hris_contractor_sync") {
      const out = await processHrisContractorSyncInbound(
        db,
        hrisContractorInputFromInbound(parsed.data),
      );
      if (out.processingStatus === "failed") {
        const body = { ok: false, id: out.id, error: out.error ?? "processing_failed" };
        await persistCache(422, { ...body });
        return NextResponse.json(body, { status: 422 });
      }
      const okBody = { ok: true, id: out.id, processingStatus: out.processingStatus };
      await persistCache(200, { ...okBody });
      return NextResponse.json(okBody);
    }

    if (parsed.data.kind === "roster_snapshot") {
      const out = await processRosterSnapshotInbound(
        db,
        parsed.data.organizationId,
        parsed.data.workers,
        parsed.data.source,
      );
      const okBody = {
        ok: true,
        id: out.id,
        processingStatus: out.processingStatus,
        driftCount: out.driftCount,
      };
      await persistCache(200, { ...okBody });
      return NextResponse.json(okBody);
    }

    if (parsed.data.kind === "hris_membership_sync") {
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
    }

    return NextResponse.json({ error: "Unsupported kind" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Persist failed" }, { status: 500 });
  }
}
