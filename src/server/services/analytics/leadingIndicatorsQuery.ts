import { and, count, desc, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { addDaysUtc, utcStartOfDay } from "@/lib/analytics/safetyDashboardKpis";
import type { Db } from "@/server/db";
import { correctiveAction, safetyObservation } from "@/server/db/schema";

export type LeadingIndicatorsParams = {
  organizationId: string;
  trailingDays: number;
  canObservation: boolean;
  canCapa: boolean;
};

export async function executeLeadingIndicatorsQuery(db: Db, params: LeadingIndicatorsParams) {
  const { organizationId, trailingDays, canObservation, canCapa } = params;

  if (!canObservation && !canCapa) {
    return null;
  }

  const anchor = utcStartOfDay(new Date());
  const since = addDaysUtc(anchor, -trailingDays);
  const now = new Date();

  const [
    overdueObservationFollowUps,
    observationsLinkedToCapaInWindow,
    repeatObservationClusters,
    observationsLinkedToVerifiedCapaInWindow,
  ] = await Promise.all([
    canObservation
      ? db
          .select({ n: count() })
          .from(safetyObservation)
          .where(
            and(
              eq(safetyObservation.organizationId, organizationId),
              inArray(safetyObservation.status, ["open", "acknowledged"]),
              isNotNull(safetyObservation.followUpDueAt),
              lt(safetyObservation.followUpDueAt, now),
            ),
          )
          .then(([r]) => Number(r?.n ?? 0))
      : Promise.resolve(null),

    canObservation
      ? db
          .select({ n: count() })
          .from(safetyObservation)
          .where(
            and(
              eq(safetyObservation.organizationId, organizationId),
              isNotNull(safetyObservation.linkedCorrectiveActionId),
              gte(safetyObservation.observedAt, since),
            ),
          )
          .then(([r]) => Number(r?.n ?? 0))
      : Promise.resolve(null),

    canObservation
      ? db
          .select({
            siteId: safetyObservation.siteId,
            category: safetyObservation.category,
            observationCount: sql<number>`cast(count(*) as integer)`,
          })
          .from(safetyObservation)
          .where(
            and(
              eq(safetyObservation.organizationId, organizationId),
              gte(safetyObservation.observedAt, since),
            ),
          )
          .groupBy(safetyObservation.siteId, safetyObservation.category)
          .having(sql`count(*) >= 2`)
          .orderBy(desc(sql`count(*)`))
          .limit(15)
          .then((rows) =>
            rows.map((r) => ({
              siteId: r.siteId,
              category: r.category,
              observationCount: Number(r.observationCount),
            })),
          )
      : Promise.resolve(null),

    canObservation && canCapa
      ? db
          .select({ n: count() })
          .from(safetyObservation)
          .innerJoin(
            correctiveAction,
            eq(safetyObservation.linkedCorrectiveActionId, correctiveAction.id),
          )
          .where(
            and(
              eq(safetyObservation.organizationId, organizationId),
              isNotNull(safetyObservation.linkedCorrectiveActionId),
              gte(safetyObservation.observedAt, since),
              eq(correctiveAction.status, "verified"),
            ),
          )
          .then(([r]) => Number(r?.n ?? 0))
      : Promise.resolve(null),
  ]);

  return {
    disclaimer:
      "Supervisory leading indicators only—not a substitute for regulatory injury/illness logs or agency submissions.",
    generatedAt: new Date().toISOString(),
    trailingDays,
    overdueObservationFollowUps,
    observationsLinkedToCapaInWindow,
    repeatObservationClusters,
    observationsLinkedToVerifiedCapaInWindow,
  };
}
