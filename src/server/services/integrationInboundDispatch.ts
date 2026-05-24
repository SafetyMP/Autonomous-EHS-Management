import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/server/db";
import { integrationEvent } from "@/server/db/schema";
import type { HrisMembershipSyncInput } from "@/lib/integration/inboundEnvelope";
import type { HrisContractorSyncInput } from "@/lib/integration/hrisContractorSync";
import type { RosterSnapshotWorker } from "@/lib/integration/rosterSnapshot";
import { applyHrisMembershipSync, hrisPayloadForIntegrationEvent } from "@/server/services/hrisMembershipSyncIngest";
import { applyHrisContractorSync } from "@/server/services/hrisContractorSyncIngest";
import {
  ingestRosterSnapshotFromPayload,
} from "@/server/services/rosterReconciliation";
import { dispatchOperationalWebhooks } from "@/server/services/operationalWebhookDispatch";
import { hrisContractorSyncSchema } from "@/lib/integration/hrisContractorSync";
import { hrisMembershipSyncSchema } from "@/lib/integration/inboundEnvelope";
import {
  reapplyTrainingCompletionFromStoredPayload,
} from "@/server/services/trainingCompletionIngest";

const storedHrisPayloadSchema = hrisMembershipSyncSchema
  .omit({ organizationId: true })
  .extend({
    workerEmail: z.string().email(),
  });

export async function processHrisMembershipSyncInbound(
  db: Db,
  input: HrisMembershipSyncInput,
): Promise<{ id: string; processingStatus: string; error?: string }> {
  const [inserted] = await db
    .insert(integrationEvent)
    .values({
      organizationId: input.organizationId,
      eventType: "hris_membership_sync",
      payload: hrisPayloadForIntegrationEvent(input),
      processingStatus: "pending",
    })
    .returning({ id: integrationEvent.id });

  if (!inserted) {
    throw new Error("Failed to insert integration event.");
  }

  try {
    const now = new Date();
    await db.transaction(async (tx) => {
      await applyHrisMembershipSync(tx, input, inserted.id, null);
      await tx
        .update(integrationEvent)
        .set({
          processingStatus: "applied",
          appliedAt: now,
          processingError: null,
        })
        .where(eq(integrationEvent.id, inserted.id));
    });
    return { id: inserted.id, processingStatus: "applied" };
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 2000);
    await db
      .update(integrationEvent)
      .set({
        processingStatus: "failed",
        processingError: msg,
      })
      .where(eq(integrationEvent.id, inserted.id));

    dispatchOperationalWebhooks({
      db,
      organizationId: input.organizationId,
      eventType: "integration.processing_failed",
      data: {
        integrationEventId: inserted.id,
        sourceEventType: "hris_membership_sync",
        processingErrorPreview: msg.slice(0, 400),
      },
    }).catch(() => undefined);

    return { id: inserted.id, processingStatus: "failed", error: msg };
  }
}

export async function reprocessFailedIntegrationEvent(
  db: Db,
  args: { organizationId: string; eventId: string; actorUserId: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const [ev] = await db
    .select()
    .from(integrationEvent)
    .where(
      and(
        eq(integrationEvent.id, args.eventId),
        eq(integrationEvent.organizationId, args.organizationId),
      ),
    )
    .limit(1);

  if (!ev) {
    return { ok: false, message: "Event not found." };
  }
  if (ev.processingStatus !== "failed") {
    return { ok: false, message: "Only failed events can be reprocessed." };
  }

  if (ev.eventType === "hris_membership_sync") {
    const parsed = storedHrisPayloadSchema.safeParse(ev.payload);
    if (!parsed.success) {
      return { ok: false, message: "Invalid stored HRIS payload." };
    }
    const input: HrisMembershipSyncInput = {
      organizationId: ev.organizationId,
      ...parsed.data,
    };
    try {
      const now = new Date();
      await db.transaction(async (tx) => {
        await applyHrisMembershipSync(tx, input, ev.id, args.actorUserId);
        await tx
          .update(integrationEvent)
          .set({
            processingStatus: "applied",
            appliedAt: now,
            processingError: null,
          })
          .where(eq(integrationEvent.id, ev.id));
      });
      return { ok: true };
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 2000);
      await db
        .update(integrationEvent)
        .set({
          processingStatus: "failed",
          processingError: msg,
        })
        .where(eq(integrationEvent.id, ev.id));
      return { ok: false, message: msg };
    }
  }

  if (ev.eventType === "training_completion") {
    try {
      const trainingRecordId = await reapplyTrainingCompletionFromStoredPayload(
        db,
        ev.organizationId,
        ev.id,
        ev.payload,
        args.actorUserId,
      );
      const now = new Date();
      await db
        .update(integrationEvent)
        .set({
          processingStatus: "applied",
          appliedAt: now,
          processingError: null,
          payload: {
            ...(typeof ev.payload === "object" && ev.payload ? ev.payload : {}),
            trainingRecordId,
            reprocessedAt: now.toISOString(),
          },
        })
        .where(eq(integrationEvent.id, ev.id));
      return { ok: true };
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 2000);
      await db
        .update(integrationEvent)
        .set({ processingStatus: "failed", processingError: msg })
        .where(eq(integrationEvent.id, ev.id));
      return { ok: false, message: msg };
    }
  }

  if (ev.eventType === "hris_contractor_sync") {
    const parsed = hrisContractorSyncSchema.safeParse({
      organizationId: ev.organizationId,
      ...(typeof ev.payload === "object" && ev.payload ? ev.payload : {}),
    });
    if (!parsed.success) {
      return { ok: false, message: "Invalid stored contractor payload." };
    }
    try {
      const now = new Date();
      await db.transaction(async (tx) => {
        await applyHrisContractorSync(tx, parsed.data, ev.id, args.actorUserId);
        await tx
          .update(integrationEvent)
          .set({
            processingStatus: "applied",
            appliedAt: now,
            processingError: null,
          })
          .where(eq(integrationEvent.id, ev.id));
      });
      return { ok: true };
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 2000);
      await db
        .update(integrationEvent)
        .set({ processingStatus: "failed", processingError: msg })
        .where(eq(integrationEvent.id, ev.id));
      return { ok: false, message: msg };
    }
  }

  if (ev.eventType === "roster_snapshot") {
    return {
      ok: false,
      message:
        "Roster snapshot reprocess is not supported from stored events; re-post the roster_snapshot batch to /api/integration/inbound.",
    };
  }

  return { ok: false, message: `Unsupported eventType: ${ev.eventType}` };
}

export async function processHrisContractorSyncInbound(
  db: Db,
  input: HrisContractorSyncInput,
): Promise<{ id: string; processingStatus: string; error?: string }> {
  const [inserted] = await db
    .insert(integrationEvent)
    .values({
      organizationId: input.organizationId,
      eventType: "hris_contractor_sync",
      payload: {
        externalWorkerId: input.externalWorkerId,
        companyName: input.companyName,
        contactName: input.contactName ?? null,
        contactEmail: input.contactEmail ?? null,
        siteId: input.siteId ?? null,
        partyType: input.partyType,
        hrisSource: input.hrisSource ?? null,
        employmentStatus: input.employmentStatus ?? null,
      },
      processingStatus: "pending",
    })
    .returning({ id: integrationEvent.id });

  if (!inserted) {
    throw new Error("Failed to insert integration event.");
  }

  try {
    const now = new Date();
    await db.transaction(async (tx) => {
      await applyHrisContractorSync(tx, input, inserted.id, null);
      await tx
        .update(integrationEvent)
        .set({
          processingStatus: "applied",
          appliedAt: now,
          processingError: null,
        })
        .where(eq(integrationEvent.id, inserted.id));
    });
    return { id: inserted.id, processingStatus: "applied" };
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 2000);
    await db
      .update(integrationEvent)
      .set({ processingStatus: "failed", processingError: msg })
      .where(eq(integrationEvent.id, inserted.id));
    return { id: inserted.id, processingStatus: "failed", error: msg };
  }
}

export async function processRosterSnapshotInbound(
  db: Db,
  organizationId: string,
  workers: RosterSnapshotWorker[],
  source?: string,
): Promise<{ id: string; processingStatus: string; driftCount: number }> {
  const [inserted] = await db
    .insert(integrationEvent)
    .values({
      organizationId,
      eventType: "roster_snapshot",
      payload: { workerCount: workers.length, source: source ?? "hris_export" },
      processingStatus: "pending",
    })
    .returning({ id: integrationEvent.id });

  if (!inserted) {
    throw new Error("Failed to insert integration event.");
  }

  const { snapshotId, driftCount } = await ingestRosterSnapshotFromPayload(
    db,
    organizationId,
    workers,
  );

  const now = new Date();
  await db
    .update(integrationEvent)
    .set({
      processingStatus: "applied",
      appliedAt: now,
      processingError: null,
      payload: { snapshotId, workerCount: workers.length, driftCount, source: source ?? "hris_export" },
    })
    .where(eq(integrationEvent.id, inserted.id));

  return { id: inserted.id, processingStatus: "applied", driftCount };
}
