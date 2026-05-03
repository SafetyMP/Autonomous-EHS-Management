import {
  and,
  count,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, userHasPermission } from "@/lib/rbac";
import {
  addDaysUtc,
  computeCapaSafetyBlock,
  computeIncidentSafetyBlock,
  trailingMonthKeys,
  utcStartOfDay,
} from "@/lib/analytics/safetyDashboardKpis";
import {
  auditFinding,
  complianceObligation,
  correctiveAction,
  environmentalAspect,
  incident,
  membership,
  trainingRecord,
} from "@/server/db/schema";
import { orgScope } from "../schemas/orgScope";
import { protectedProcedure, router } from "../init";

async function assertOrgMember(
  db: import("@/server/db").Db,
  userId: string,
  organizationId: string,
) {
  const [m] = await db
    .select({ id: membership.id })
    .from(membership)
    .where(
      and(eq(membership.userId, userId), eq(membership.organizationId, organizationId)),
    )
    .limit(1);
  if (!m) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not a member of this organization.",
    });
  }
}

export const analyticsRouter = router({
  /**
   * Permission-scoped safety / compliance KPIs and simple time-bucket series for dashboard charts.
   * Sections are omitted (null) when the caller lacks the corresponding read permission.
   */
  safetyDashboard: protectedProcedure
    .input(
      orgScope.extend({
        trailingMonths: z.number().int().min(3).max(24).optional().default(12),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertOrgMember(ctx.db, ctx.user.id, input.organizationId);

      const [
        canIncident,
        canCapa,
        canTraining,
        canFinding,
        canObligation,
        canAspect,
      ] = await Promise.all([
        userHasPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.INCIDENT_READ),
        userHasPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.CAPA_READ),
        userHasPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.TRAINING_READ),
        userHasPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.FINDING_READ),
        userHasPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.OBLIGATION_READ),
        userHasPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.ASPECT_READ),
      ]);

      const trailing = input.trailingMonths;
      const anchor = new Date();
      const monthLabels = trailingMonthKeys(trailing, anchor);
      const rangeStart = new Date(
        Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - (trailing - 1), 1),
      );

      const todayStart = utcStartOfDay(anchor);
      const trainingHorizon = addDaysUtc(todayStart, 30);

      const [incidentsBlock, capaBlock, trainingBlock, findingsBlock, envBlock] =
        await Promise.all([
          canIncident
            ? (async () => {
                const byStatus = await ctx.db
                  .select({
                    status: incident.status,
                    n: count(),
                  })
                  .from(incident)
                  .where(eq(incident.organizationId, input.organizationId))
                  .groupBy(incident.status);

                const byType = await ctx.db
                  .select({
                    incidentType: incident.incidentType,
                    n: count(),
                  })
                  .from(incident)
                  .where(eq(incident.organizationId, input.organizationId))
                  .groupBy(incident.incidentType);

                const byMonth = await ctx.db
                  .select({
                    yyyymm: sql<string>`to_char(date_trunc('month', ${incident.createdAt}), 'YYYY-MM')`,
                    n: count(),
                  })
                  .from(incident)
                  .where(
                    and(
                      eq(incident.organizationId, input.organizationId),
                      gte(incident.createdAt, rangeStart),
                    ),
                  )
                  .groupBy(sql`date_trunc('month', ${incident.createdAt})`)
                  .orderBy(sql`date_trunc('month', ${incident.createdAt})`);

                const [nearMissOpenRow] = await ctx.db
                  .select({ n: count() })
                  .from(incident)
                  .where(
                    and(
                      eq(incident.organizationId, input.organizationId),
                      eq(incident.incidentType, "near_miss"),
                      ne(incident.status, "closed"),
                    ),
                  );

                const closedRows = await ctx.db
                  .select({
                    createdAt: incident.createdAt,
                    updatedAt: incident.updatedAt,
                  })
                  .from(incident)
                  .where(
                    and(
                      eq(incident.organizationId, input.organizationId),
                      eq(incident.status, "closed"),
                    ),
                  );

                return computeIncidentSafetyBlock({
                  monthLabels,
                  byStatus,
                  byType,
                  byMonth,
                  nearMissOpenCount: Number(nearMissOpenRow?.n ?? 0),
                  closedRows,
                });
              })()
            : Promise.resolve(null),

          canCapa
            ? (async () => {
                const byStatus = await ctx.db
                  .select({
                    status: correctiveAction.status,
                    n: count(),
                  })
                  .from(correctiveAction)
                  .where(eq(correctiveAction.organizationId, input.organizationId))
                  .groupBy(correctiveAction.status);

                const [overdueRow] = await ctx.db
                  .select({ n: count() })
                  .from(correctiveAction)
                  .where(
                    and(
                      eq(correctiveAction.organizationId, input.organizationId),
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
                const [withExpiry] = await ctx.db
                  .select({ n: count() })
                  .from(trainingRecord)
                  .where(
                    and(
                      eq(trainingRecord.organizationId, input.organizationId),
                      isNotNull(trainingRecord.expiresOn),
                    ),
                  );

                const [dueSoon] = await ctx.db
                  .select({ n: count() })
                  .from(trainingRecord)
                  .where(
                    and(
                      eq(trainingRecord.organizationId, input.organizationId),
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
            ? (async () => {
                const [openNc] = await ctx.db
                  .select({ n: count() })
                  .from(auditFinding)
                  .leftJoin(
                    correctiveAction,
                    eq(auditFinding.correctiveActionId, correctiveAction.id),
                  )
                  .where(
                    and(
                      eq(auditFinding.organizationId, input.organizationId),
                      inArray(auditFinding.findingType, ["minor_nc", "major_nc"]),
                      or(
                        isNull(correctiveAction.id),
                        ne(correctiveAction.status, "verified"),
                      ),
                    ),
                  );

                return {
                  openNonConformanceCount: Number(openNc?.n ?? 0),
                };
              })()
            : Promise.resolve(null),

          canObligation || canAspect
            ? (async () => {
                let aspectCount: number | null = null;
                if (canAspect) {
                  const [a] = await ctx.db
                    .select({ n: count() })
                    .from(environmentalAspect)
                    .where(eq(environmentalAspect.organizationId, input.organizationId));
                  aspectCount = Number(a?.n ?? 0);
                }

                let obligationCount: number | null = null;
                let obligationsReviewOverdue: number | null = null;
                if (canObligation) {
                  const [o] = await ctx.db
                    .select({ n: count() })
                    .from(complianceObligation)
                    .where(eq(complianceObligation.organizationId, input.organizationId));
                  obligationCount = Number(o?.n ?? 0);

                  const [od] = await ctx.db
                    .select({ n: count() })
                    .from(complianceObligation)
                    .where(
                      and(
                        eq(complianceObligation.organizationId, input.organizationId),
                        isNotNull(complianceObligation.nextReviewDue),
                        lt(complianceObligation.nextReviewDue, todayStart),
                      ),
                    );
                  obligationsReviewOverdue = Number(od?.n ?? 0);
                }

                return { aspectCount, obligationCount, obligationsReviewOverdue };
              })()
            : Promise.resolve(null),
        ]);

      return {
        glossaryVersion: 1 as const,
        generatedAt: new Date().toISOString(),
        incidents: incidentsBlock,
        capas: capaBlock,
        training: trainingBlock,
        auditFindings: findingsBlock,
        environment: envBlock,
      };
    }),
});
