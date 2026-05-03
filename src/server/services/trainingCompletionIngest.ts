import type { Db } from "@/server/db";
import { integrationEvent } from "@/server/db/schema";
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

type DbIns = Pick<Db, "insert" | "transaction">;

export async function persistTrainingCompletionEvent(
  db: DbIns,
  input: TrainingCompletionIngestInput,
  actorUserId: string | null,
): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(integrationEvent)
      .values({
        organizationId: input.organizationId,
        eventType: "training_completion",
        payload: redactTrainingCompletionForStorage(input),
      })
      .returning({ id: integrationEvent.id });

    if (!row) {
      throw new Error("Failed to insert integration event.");
    }

    await writeAuditLog(tx, {
      organizationId: input.organizationId,
      actorUserId,
      action: "integration.ingest_training_completion",
      entityType: "integration_event",
      entityId: row.id,
      payload: { eventType: "training_completion", courseCode: input.courseCode },
    });

    return row;
  });
}
