import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import type { Db } from "@/server/db";
import { escalationEvent, safetyObservation } from "@/server/db/schema";

export type NewObservationFollowUpEscalation = {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  message: string | null;
};

/** Inserts one `escalation_event` per overdue observation follow-up (deduped by observation id). */
export async function recordOverdueObservationFollowUpEscalations(
  db: Db,
  now: Date = new Date(),
): Promise<{ inserted: number; newlyCreated: NewObservationFollowUpEscalation[] }> {
  const overdueRows = await db
    .select({ id: safetyObservation.id, organizationId: safetyObservation.organizationId })
    .from(safetyObservation)
    .where(
      and(
        inArray(safetyObservation.status, ["open", "acknowledged"]),
        isNotNull(safetyObservation.followUpDueAt),
        lt(safetyObservation.followUpDueAt, now),
      ),
    )
    .limit(2000);

  let inserted = 0;
  const newlyCreated: NewObservationFollowUpEscalation[] = [];

  for (const row of overdueRows) {
    const [existing] = await db
      .select({ id: escalationEvent.id })
      .from(escalationEvent)
      .where(
        and(
          eq(escalationEvent.organizationId, row.organizationId),
          eq(escalationEvent.entityType, "safety_observation"),
          eq(escalationEvent.entityId, row.id),
        ),
      )
      .limit(1);

    if (existing) continue;

    const [created] = await db
      .insert(escalationEvent)
      .values({
        organizationId: row.organizationId,
        entityType: "safety_observation",
        entityId: row.id,
        message: `Observation follow-up overdue (id ${row.id}).`,
        notifiedUserIds: [],
      })
      .returning({
        id: escalationEvent.id,
        organizationId: escalationEvent.organizationId,
        entityType: escalationEvent.entityType,
        entityId: escalationEvent.entityId,
        message: escalationEvent.message,
      });

    if (created) {
      inserted += 1;
      newlyCreated.push({
        id: created.id,
        organizationId: created.organizationId,
        entityType: created.entityType,
        entityId: created.entityId,
        message: created.message ?? null,
      });
    }
  }

  return { inserted, newlyCreated };
}
