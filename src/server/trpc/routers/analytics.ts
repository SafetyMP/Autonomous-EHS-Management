import { z } from "zod";
import { PERMISSIONS, userHasPermission } from "@/lib/rbac";
import { executeCommandCenterQuery } from "@/server/services/analytics/commandCenterQuery";
import { executeLeadingIndicatorsQuery } from "@/server/services/analytics/leadingIndicatorsQuery";
import { executeOperationsAutonomyQuery } from "@/server/services/analytics/operationsAutonomyQuery";
import { executeSafetyDashboardQuery } from "@/server/services/analytics/safetyDashboardQuery";
import { fetchObservationFollowUpSlaDashboard } from "@/server/services/analytics/observationFollowUpSla";
import { assertCallerOrgMember } from "../assertOrgScoped";
import { orgScope } from "../schemas/orgScope";
import { protectedProcedure, router } from "../init";

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
      await assertCallerOrgMember(ctx.db, ctx.user.id, input.organizationId);

      const [
        canIncident,
        canCapa,
        canTraining,
        canFinding,
        canObligation,
        canAspect,
        canPermit,
        canObservation,
      ] = await Promise.all([
        userHasPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.INCIDENT_READ),
        userHasPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.CAPA_READ),
        userHasPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.TRAINING_READ),
        userHasPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.FINDING_READ),
        userHasPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.OBLIGATION_READ),
        userHasPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.ASPECT_READ),
        userHasPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.WORK_PERMIT_READ),
        userHasPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.SAFETY_OBSERVATION_READ),
      ]);

      return executeSafetyDashboardQuery(ctx.db, {
        organizationId: input.organizationId,
        trailingMonths: input.trailingMonths,
        canIncident,
        canCapa,
        canTraining,
        canFinding,
        canObligation,
        canAspect,
        canPermit,
        canObservation,
      });
    }),

  /**
   * Permission-scoped operations snapshot for dashboard home (KPIs + recent entity activity).
   * Does not expose `audit_log`; feed rows come only from domain tables the caller can read.
   */
  commandCenter: protectedProcedure
    .input(
      orgScope.extend({
        feedLimitPerType: z.number().int().min(1).max(15).optional().default(8),
        feedTotalMax: z.number().int().min(5).max(50).optional().default(25),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertCallerOrgMember(ctx.db, ctx.user.id, input.organizationId);
      const orgId = input.organizationId;

      const [
        canIncident,
        canCapa,
        canPermit,
        canObservation,
        canInspection,
        canAspect,
        canObligation,
        capaApprove,
        permitApprove,
        envPermitApprove,
        canTasksRead,
        canFinding,
        canRisk,
        canEnvPermit,
        canOrgAdmin,
      ] = await Promise.all([
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.INCIDENT_READ),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.CAPA_READ),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.WORK_PERMIT_READ),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.SAFETY_OBSERVATION_READ),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.INSPECTION_READ),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.ASPECT_READ),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.OBLIGATION_READ),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.CAPA_APPROVE),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.WORK_PERMIT_APPROVE),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.ENVIRONMENTAL_PERMIT_APPROVE),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.TASKS_READ),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.FINDING_READ),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.RISK_READ),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.ENVIRONMENTAL_PERMIT_READ),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.ORG_ADMIN),
      ]);

      return executeCommandCenterQuery(
        ctx.db,
        ctx.user.id,
        {
          organizationId: orgId,
          feedLimitPerType: input.feedLimitPerType,
          feedTotalMax: input.feedTotalMax,
        },
        {
          canIncident,
          canCapa,
          canPermit,
          canObservation,
          canInspection,
          canAspect,
          canObligation,
          capaApprove,
          permitApprove,
          envPermitApprove,
          canTasksRead,
          canFinding,
          canRisk,
          canEnvPermit,
          canOrgAdmin,
        },
      );
    }),

  /** Program automation: SLA escalations recorded (org) + latest cron runs (org admins). */
  operationsAutonomy: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertCallerOrgMember(ctx.db, ctx.user.id, input.organizationId);
    const orgId = input.organizationId;

    const [canObservation, capaApprove, permitApprove, envPermitApprove, canOrgAdmin] =
      await Promise.all([
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.SAFETY_OBSERVATION_READ),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.CAPA_APPROVE),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.WORK_PERMIT_APPROVE),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.ENVIRONMENTAL_PERMIT_APPROVE),
        userHasPermission(ctx.db, ctx.user.id, orgId, PERMISSIONS.ORG_ADMIN),
      ]);

    return executeOperationsAutonomyQuery(ctx.db, orgId, {
      canObservation,
      capaApprove,
      permitApprove,
      envPermitApprove,
      canOrgAdmin,
    });
  }),

  /** Leading indicators (observation-/CAPA-linked); informational only—not regulatory filings. */
  leadingIndicators: protectedProcedure
    .input(
      orgScope.extend({
        trailingDays: z.number().int().min(7).max(365).optional().default(90),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertCallerOrgMember(ctx.db, ctx.user.id, input.organizationId);

      const canObservation = await userHasPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.SAFETY_OBSERVATION_READ,
      );
      const canCapa = await userHasPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CAPA_READ,
      );

      return executeLeadingIndicatorsQuery(ctx.db, {
        organizationId: input.organizationId,
        trailingDays: input.trailingDays,
        canObservation,
        canCapa,
      });
    }),

  /**
   * Observation follow-up SLA rollups (“ladder”: overdue vs dueSoon vs recorded escalations).
   */
  observationFollowUpSla: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertCallerOrgMember(ctx.db, ctx.user.id, input.organizationId);
    const canObservation = await userHasPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.SAFETY_OBSERVATION_READ,
    );
    if (!canObservation) {
      return null;
    }
    return fetchObservationFollowUpSlaDashboard(ctx.db, input.organizationId, new Date());
  }),
});
