import { and, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { integrationEvent, membership, trainingRecord } from "@/server/db/schema";
import {
  type TrainingCompletionIngestInput,
  redactTrainingCompletionForStorage,
  trainingCompletionIngestSchema,
} from "@/lib/integration/trainingCompletion";
import { writeAuditLog } from "@/server/services/audit";
import type { ZodError } from "zod";

export function parseTrainingCompletionPayload(
  raw: unknown,
):
  | { success: true; data: TrainingCompletionIngestInput }
  | { success: false; error: ZodError } {
  const parsed = trainingCompletionIngestSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }
  return { success: true, data: parsed.data };
}

const MS_YEAR = 365 * 24 * 60 * 60 * 1000;

async function resolveUserIdForExternalWorker(
  db: Pick<Db, "select">,
  organizationId: string,
  externalWorkerId: string,
): Promise<string | null> {
  const [mem] = await db
    .select({ userId: membership.userId })
    .from(membership)
    .where(
      and(
        eq(membership.organizationId, organizationId),
        eq(membership.externalWorkerId, externalWorkerId),
      ),
    )
    .limit(1);
  return mem?.userId ?? null;
}

async function upsertTrainingRecordFromCompletion(
  db: Pick<Db, "select" | "insert" | "update">,
  input: TrainingCompletionIngestInput,
  userId: string | null,
): Promise<string | null> {
  const expiresOn = new Date(input.completedAt.getTime() + MS_YEAR);
  const courseTitle = input.courseCode;

  if (userId) {
    const [existing] = await db
      .select({ id: trainingRecord.id })
      .from(trainingRecord)
      .where(
        and(
          eq(trainingRecord.organizationId, input.organizationId),
          eq(trainingRecord.userId, userId),
          eq(trainingRecord.courseTitle, courseTitle),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(trainingRecord)
        .set({
          completedOn: input.completedAt,
          expiresOn,
          evidenceNote: `LMS issuer: ${input.issuer}`,
        })
        .where(eq(trainingRecord.id, existing.id));
      return existing.id;
    }
  }

  const [inserted] = await db
    .insert(trainingRecord)
    .values({
      organizationId: input.organizationId,
      userId,
      traineeName: userId ? courseTitle : `Worker ${input.externalWorkerId.slice(0, 8)}`,
      courseTitle,
      completedOn: input.completedAt,
      expiresOn,
      evidenceNote: `LMS issuer: ${input.issuer}; externalWorkerId: ${input.externalWorkerId}`,
    })
    .returning({ id: trainingRecord.id });

  return inserted?.id ?? null;
}

type DbIns = Pick<Db, "insert" | "transaction" | "update" | "select">;

export async function persistTrainingCompletionEvent(
  db: DbIns,
  input: TrainingCompletionIngestInput,
  actorUserId: string | null,
): Promise<{ id: string; trainingRecordId: string | null }> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [row] = await tx
      .insert(integrationEvent)
      .values({
        organizationId: input.organizationId,
        eventType: "training_completion",
        payload: redactTrainingCompletionForStorage(input),
        processingStatus: "applied",
        appliedAt: now,
      })
      .returning({ id: integrationEvent.id });

    if (!row) {
      throw new Error("Failed to insert integration event.");
    }

    const userId = await resolveUserIdForExternalWorker(tx, input.organizationId, input.externalWorkerId);
    const trainingRecordId = await upsertTrainingRecordFromCompletion(tx, input, userId);

    await writeAuditLog(tx, {
      organizationId: input.organizationId,
      actorUserId,
      action: "integration.ingest_training_completion",
      entityType: "integration_event",
      entityId: row.id,
      payload: {
        eventType: "training_completion",
        courseCode: input.courseCode,
        trainingRecordId,
        userMatched: Boolean(userId),
      },
    });

    return { id: row.id, trainingRecordId };
  });
}

const REDACTED_EXTERNAL_WORKER_ID = /^\[redacted:\d+chars\]$/;

export async function reapplyTrainingCompletionFromStoredPayload(
  db: DbIns,
  organizationId: string,
  eventId: string,
  payload: unknown,
  actorUserId: string,
): Promise<string | null> {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid stored training payload.");
  }
  const raw = payload as Record<string, unknown>;
  const externalWorkerId = String(raw.externalWorkerId ?? "");
  if (!externalWorkerId || REDACTED_EXTERNAL_WORKER_ID.test(externalWorkerId)) {
    throw new Error(
      "Reprocess requires re-posting from LMS; stored externalWorkerId was redacted.",
    );
  }

  const parsed = trainingCompletionIngestSchema.safeParse({
    organizationId,
    externalWorkerId,
    courseCode: raw.courseCode,
    completedAt: raw.completedAt,
    issuer: raw.issuer ?? "lms_reprocess",
  });
  if (!parsed.success) {
    throw new Error("Invalid stored training payload.");
  }

  const userId = await resolveUserIdForExternalWorker(
    db,
    organizationId,
    parsed.data.externalWorkerId,
  );
  const trainingRecordId = await upsertTrainingRecordFromCompletion(db, parsed.data, userId);

  await writeAuditLog(db, {
    organizationId,
    actorUserId,
    action: "integration.reprocess_training_completion",
    entityType: "integration_event",
    entityId: eventId,
    payload: {
      courseCode: parsed.data.courseCode,
      trainingRecordId,
      userMatched: Boolean(userId),
    },
  });

  return trainingRecordId;
}
