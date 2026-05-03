import { and, count, eq, gte, isNotNull, lt, lte, ne, sql } from "drizzle-orm";
import {
  addDaysUtc,
  computeCapaSafetyBlock,
  computeIncidentSafetyBlock,
  trailingMonthKeys,
  utcStartOfDay,
} from "@/lib/analytics/safetyDashboardKpis";
import type { Db } from "@/server/db";
import { correctiveAction, incident, trainingRecord } from "@/server/db/schema";
import {
  countOpenAuditNonConformances,
  fetchEnvironmentKpiSnapshot,
  fetchFieldOperationsKpiSnapshot,
} from "@/server/services/analytics/sharedKpiQueries";

export type SafetyDashboardQueryParams = {
  organizationId: string;
  trailingMonths: number;
  canIncident: boolean;
  canCapa: boolean;
  canTraining: boolean;
  canFinding: boolean;
  canObligation: boolean;
  canAspect: boolean;
  canPermit: boolean;
  canObservation: boolean;
};

export async function executeSafetyDashboardQuery(db: Db, params: SafetyDashboardQueryParams) {
  const {
    organizationId,
    trailingMonths: trailing,
    canIncident,
    canCapa,
    canTraining,
    canFinding,
    canObligation,
    canAspect,
    canPermit,
    canObservation,
  } = params;

  const anchor = new Date();
  const monthLabels = trailingMonthKeys(trailing, anchor);
  const rangeStart = new Date(
    Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - (trailing - 1), 1),
  );

  const todayStart = utcStartOfDay(anchor);
  const trainingHorizon = addDaysUtc(todayStart, 30);

  const [incidentsBlock, capaBlock, trainingBlock, findingsBlock, envBlock, fieldOperations] =
    await Promise.all([
      canIncident
        ? (async () => {
            const byStatus = await db
              .select({
                status: incident.status,
                n: count(),
              })
              .from(incident)
              .where(eq(incident.organizationId, organizationId))
              .groupBy(incident.status);

            const byType = await db
              .select({
                incidentType: incident.incidentType,
                n: count(),
              })
              .from(incident)
              .where(eq(incident.organizationId, organizationId))
              .groupBy(incident.incidentType);

            const byMonth = await db
              .select({
                yyyymm: sql<string>`to_char(date_trunc('month', ${incident.createdAt}), 'YYYY-MM')`,
                n: count(),
              })
              .from(incident)
              .where(
                and(
                  eq(incident.organizationId, organizationId),
                  gte(incident.createdAt, rangeStart),
                ),
              )
              .groupBy(sql`date_trunc('month', ${incident.createdAt})`)
              .orderBy(sql`date_trunc('month', ${incident.createdAt})`);

            const [nearMissOpenRow] = await db
              .select({ n: count() })
              .from(incident)
              .where(
                and(
                  eq(incident.organizationId, organizationId),
                  eq(incident.incidentType, "near_miss"),
                  ne(incident.status, "closed"),
                ),
              );

            const [meanRow] = await db
              .select({
                meanDays: sql<string | number | null>`round(avg(greatest(0, extract(epoch from (${incident.updatedAt} - ${incident.createdAt})) / 86400))::numeric, 1)`,
              })
              .from(incident)
              .where(
                and(
                  eq(incident.organizationId, organizationId),
                  eq(incident.status, "closed"),
                ),
              );

            const md = meanRow?.meanDays;
            const meanDaysToCloseSnapshot =
              md == null
                ? null
                : (() => {
                    const n = typeof md === "number" ? md : Number.parseFloat(String(md));
                    return Number.isFinite(n) ? n : null;
                  })();

            return computeIncidentSafetyBlock({
              monthLabels,
              byStatus,
              byType,
              byMonth,
              nearMissOpenCount: Number(nearMissOpenRow?.n ?? 0),
              meanDaysToCloseSnapshot,
            });
          })()
        : Promise.resolve(null),

      canCapa
        ? (async () => {
            const byStatus = await db
              .select({
                status: correctiveAction.status,
                n: count(),
              })
              .from(correctiveAction)
              .where(eq(correctiveAction.organizationId, organizationId))
              .groupBy(correctiveAction.status);

            const [overdueRow] = await db
              .select({ n: count() })
              .from(correctiveAction)
              .where(
                and(
                  eq(correctiveAction.organizationId, organizationId),
                  ne(correctiveAction.status, "verified"),
                  isNotNull(correctiveAction.dueDate),
                  lt(correctiveAction.dueDate, todayStart),
                ),
              );

            return computeCapaSafetyBlock({
              byStatus,
              overdueCount: Number(overdueRow?.n ?? 0),
            });
          })()
        : Promise.resolve(null),

      canTraining
        ? (async () => {
            const [withExpiry] = await db
              .select({ n: count() })
              .from(trainingRecord)
              .where(
                and(
                  eq(trainingRecord.organizationId, organizationId),
                  isNotNull(trainingRecord.expiresOn),
                ),
              );

            const [dueSoon] = await db
              .select({ n: count() })
              .from(trainingRecord)
              .where(
                and(
                  eq(trainingRecord.organizationId, organizationId),
                  isNotNull(trainingRecord.expiresOn),
                  lte(trainingRecord.expiresOn, trainingHorizon),
                ),
              );

            return {
              recordsWithExpiry: Number(withExpiry?.n ?? 0),
              expiringWithin30DaysCount: Number(dueSoon?.n ?? 0),
            };
          })()
        : Promise.resolve(null),

      canFinding
        ? countOpenAuditNonConformances(db, organizationId).then((n) => ({
            openNonConformanceCount: n,
          }))
        : Promise.resolve(null),

      canObligation || canAspect
        ? fetchEnvironmentKpiSnapshot(db, organizationId, { canAspect, canObligation }, todayStart)
        : Promise.resolve(null),

      canPermit || canObservation
        ? fetchFieldOperationsKpiSnapshot(
            db,
            organizationId,
            { canPermit, canObservation },
            todayStart,
          )
        : Promise.resolve(null),
    ]);

  return {
    glossaryVersion: 3 as const,
    generatedAt: new Date().toISOString(),
    incidents: incidentsBlock,
    capas: capaBlock,
    training: trainingBlock,
    auditFindings: findingsBlock,
    environment: envBlock,
    fieldOperations,
  };
}
