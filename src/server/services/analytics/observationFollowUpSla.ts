import { and, asc, count, desc, eq, gte, inArray, isNotNull, lte, lt } from "drizzle-orm";
import type { Db } from "@/server/db";
import { escalationEvent, safetyObservation } from "@/server/db/schema";
import { addDaysUtc } from "@/lib/analytics/safetyDashboardKpis";

/** Supervisory SLA slice for observations with scheduled follow-ups. */
export async function fetchObservationFollowUpSlaDashboard(
  db: Db,
  organizationId: string,
  anchor: Date = new Date(),
) {
  const now = anchor;
  const ninetyDays = addDaysUtc(now, -90);

  const baseOpen = and(
    eq(safetyObservation.organizationId, organizationId),
    inArray(safetyObservation.status, ["open", "acknowledged"]),
    isNotNull(safetyObservation.followUpDueAt),
  );

  const [[overdueRow], [dueNext7Row], [openTrackedRow], [escalationsRecentRow]] = await Promise.all([
    db
      .select({ n: count() })
      .from(safetyObservation)
      .where(and(baseOpen, lt(safetyObservation.followUpDueAt, now)))
      .then(([r]) => [r]),
    db
      .select({ n: count() })
      .from(safetyObservation)
      .where(
        and(
          baseOpen,
          gte(safetyObservation.followUpDueAt, now),
          lt(safetyObservation.followUpDueAt, addDaysUtc(now, 7)),
        ),
      )
      .then(([r]) => [r]),
    db
      .select({ n: count() })
      .from(safetyObservation)
      .where(baseOpen)
      .then(([r]) => [r]),
    db
      .select({ n: count() })
      .from(escalationEvent)
      .where(
        and(
          eq(escalationEvent.organizationId, organizationId),
          eq(escalationEvent.entityType, "safety_observation"),
          gte(escalationEvent.detectedAt, ninetyDays),
        ),
      )
      .then(([r]) => [r]),
  ]);

  const overdueSamples = await db
    .select({
      id: safetyObservation.id,
      summary: safetyObservation.summary,
      status: safetyObservation.status,
      followUpDueAt: safetyObservation.followUpDueAt,
      assigneeUserId: safetyObservation.assigneeUserId,
    })
    .from(safetyObservation)
    .where(and(baseOpen, lt(safetyObservation.followUpDueAt, now)))
    .orderBy(asc(safetyObservation.followUpDueAt))
    .limit(20);

  const dueSoonSamples = await db
    .select({
      id: safetyObservation.id,
      summary: safetyObservation.summary,
      status: safetyObservation.status,
      followUpDueAt: safetyObservation.followUpDueAt,
      assigneeUserId: safetyObservation.assigneeUserId,
    })
    .from(safetyObservation)
    .where(
      and(
        baseOpen,
        gte(safetyObservation.followUpDueAt, now),
        lte(safetyObservation.followUpDueAt, addDaysUtc(now, 7)),
      ),
    )
    .orderBy(asc(safetyObservation.followUpDueAt))
    .limit(20);

  const latestEscalations = await db
    .select({
      id: escalationEvent.id,
      entityId: escalationEvent.entityId,
      detectedAt: escalationEvent.detectedAt,
      message: escalationEvent.message,
    })
    .from(escalationEvent)
    .where(
      and(
        eq(escalationEvent.organizationId, organizationId),
        eq(escalationEvent.entityType, "safety_observation"),
      ),
    )
    .orderBy(desc(escalationEvent.detectedAt))
    .limit(15);

  return {
    generatedAt: now.toISOString(),
    overdueFollowUpCount: Number(overdueRow?.n ?? 0),
    followUpDueWithin7DaysCount: Number(dueNext7Row?.n ?? 0),
    openObservationWithFollowUpCount: Number(openTrackedRow?.n ?? 0),
    observationEscalationsLast90Days: Number(escalationsRecentRow?.n ?? 0),
    overdueSamples,
    dueSoonSamples,
    latestEscalations,
  };
}
