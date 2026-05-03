import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  lt,
  lte,
  ne,
  or,
} from "drizzle-orm";
import { addDaysUtc, utcStartOfDay } from "@/lib/analytics/safetyDashboardKpis";
import { approvalRequestEntityTypeCondition } from "@/server/services/approvalRequestEntityTypeCondition";
import { buildSortedActivityFeed } from "@/server/services/analytics/commandCenterFeed";
import {
  fetchCronHealthForAdmin,
  fetchProgramAutomationKpis,
} from "@/server/services/analytics/operationsAutonomyKpis";
import {
  countOpenAuditNonConformances,
  fetchEnvironmentKpiSnapshot,
  fetchFieldOperationsKpiSnapshot,
} from "@/server/services/analytics/sharedKpiQueries";
import type { Db } from "@/server/db";
import {
  approvalRequest,
  approvalStep,
  auditFinding,
  complianceObligation,
  correctiveAction,
  environmentalRegulatoryPermit,
  incident,
  inspection,
  managementReview,
  riskAssessment,
  safetyObservation,
  trainingRecord,
  workPermit,
} from "@/server/db/schema";

export type CommandCenterQueryInput = {
  organizationId: string;
  feedLimitPerType: number;
  feedTotalMax: number;
};

/** Permission flags in the same order as loaded in analytics.commandCenter. */
export type CommandCenterPermissionFlags = {
  canIncident: boolean;
  canCapa: boolean;
  canPermit: boolean;
  canObservation: boolean;
  canInspection: boolean;
  canAspect: boolean;
  canObligation: boolean;
  capaApprove: boolean;
  permitApprove: boolean;
  envPermitApprove: boolean;
  canTasksRead: boolean;
  canFinding: boolean;
  canRisk: boolean;
  canEnvPermit: boolean;
  canOrgAdmin: boolean;
};

export async function executeCommandCenterQuery(
  db: Db,
  userId: string,
  input: CommandCenterQueryInput,
  permissions: CommandCenterPermissionFlags,
) {
  const orgId = input.organizationId;
  const todayStart = utcStartOfDay(new Date());
  const perType = input.feedLimitPerType;
  const feedMax = input.feedTotalMax;

  const {
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
  } = permissions;

  const [
    incidentsKpi,
    capasKpi,
    envKpi,
    fieldOpsKpi,
    approvalsKpi,
    inspectionsKpi,
    tasksKpi,
    findingsKpi,
    feedIncidents,
    feedCapas,
    feedPermits,
    feedObservations,
    feedInspections,
    feedFindings,
    riskProgramKpi,
    environmentalPermitsKpi,
    feedRiskAssessments,
    feedEnvironmentalPermits,
  ] = await Promise.all([
    canIncident
      ? (async () => {
          const [r] = await db
            .select({ n: count() })
            .from(incident)
            .where(and(eq(incident.organizationId, orgId), ne(incident.status, "closed")));
          return { openCount: Number(r?.n ?? 0) };
        })()
      : Promise.resolve(null),

    canCapa
      ? (async () => {
          const [overdueRow] = await db
            .select({ n: count() })
            .from(correctiveAction)
            .where(
              and(
                eq(correctiveAction.organizationId, orgId),
                ne(correctiveAction.status, "verified"),
                isNotNull(correctiveAction.dueDate),
                lt(correctiveAction.dueDate, todayStart),
              ),
            );
          return { overdueCount: Number(overdueRow?.n ?? 0) };
        })()
      : Promise.resolve(null),

    canAspect || canObligation
      ? fetchEnvironmentKpiSnapshot(db, orgId, { canAspect, canObligation }, todayStart)
      : Promise.resolve(null),

    canPermit || canObservation
      ? fetchFieldOperationsKpiSnapshot(db, orgId, { canPermit, canObservation }, todayStart)
      : Promise.resolve(null),

    capaApprove || permitApprove || envPermitApprove
      ? (async () => {
          const entityCond = approvalRequestEntityTypeCondition({
            capaApprove,
            permitApprove,
            environmentalPermitApprove: envPermitApprove,
          });

          const [row] = await db
            .select({ n: count() })
            .from(approvalStep)
            .innerJoin(approvalRequest, eq(approvalStep.requestId, approvalRequest.id))
            .where(
              and(
                eq(approvalRequest.organizationId, orgId),
                eq(approvalStep.approverUserId, userId),
                eq(approvalStep.status, "pending"),
                eq(approvalRequest.status, "open"),
                entityCond,
              ),
            );
          return { myPendingStepsCount: Number(row?.n ?? 0) };
        })()
      : Promise.resolve(null),

    canInspection
      ? (async () => {
          const [row] = await db
            .select({ n: count() })
            .from(inspection)
            .where(
              and(
                eq(inspection.organizationId, orgId),
                isNotNull(inspection.scheduledAt),
                lte(inspection.scheduledAt, todayStart),
                inArray(inspection.status, ["scheduled", "in_progress"]),
              ),
            );
          return { overdueScheduledCount: Number(row?.n ?? 0) };
        })()
      : Promise.resolve(null),

    canTasksRead
      ? (async () => {
          const uid = userId;
          const trainingHorizon = addDaysUtc(todayStart, 30);
          const [capaC, oblC, trainC, revC] = await Promise.all([
            db
              .select({ n: count() })
              .from(correctiveAction)
              .where(
                and(
                  eq(correctiveAction.organizationId, orgId),
                  eq(correctiveAction.ownerUserId, uid),
                  or(
                    eq(correctiveAction.status, "pending_approval"),
                    eq(correctiveAction.status, "planned"),
                    eq(correctiveAction.status, "in_progress"),
                  ),
                ),
              )
              .then(([r]) => Number(r?.n ?? 0)),
            db
              .select({ n: count() })
              .from(complianceObligation)
              .where(
                and(
                  eq(complianceObligation.organizationId, orgId),
                  lte(complianceObligation.nextReviewDue, new Date()),
                  isNotNull(complianceObligation.nextReviewDue),
                ),
              )
              .then(([r]) => Number(r?.n ?? 0)),
            db
              .select({ n: count() })
              .from(trainingRecord)
              .where(
                and(
                  eq(trainingRecord.organizationId, orgId),
                  eq(trainingRecord.userId, uid),
                  lte(trainingRecord.expiresOn, trainingHorizon),
                  isNotNull(trainingRecord.expiresOn),
                ),
              )
              .then(([r]) => Number(r?.n ?? 0)),
            db
              .select({ n: count() })
              .from(managementReview)
              .where(
                and(
                  eq(managementReview.organizationId, orgId),
                  lte(managementReview.nextReviewDue, new Date()),
                  isNotNull(managementReview.nextReviewDue),
                ),
              )
              .then(([r]) => Number(r?.n ?? 0)),
          ]);
          return { myOpenItemCount: capaC + oblC + trainC + revC };
        })()
      : Promise.resolve(null),

    canFinding
      ? countOpenAuditNonConformances(db, orgId).then((n) => ({
          openNonConformanceCount: n,
        }))
      : Promise.resolve(null),

    canIncident
      ? db
          .select({
            id: incident.id,
            title: incident.title,
            status: incident.status,
            updatedAt: incident.updatedAt,
          })
          .from(incident)
          .where(eq(incident.organizationId, orgId))
          .orderBy(desc(incident.updatedAt))
          .limit(perType)
      : Promise.resolve([]),

    canCapa
      ? db
          .select({
            id: correctiveAction.id,
            title: correctiveAction.title,
            status: correctiveAction.status,
            updatedAt: correctiveAction.updatedAt,
          })
          .from(correctiveAction)
          .where(eq(correctiveAction.organizationId, orgId))
          .orderBy(desc(correctiveAction.updatedAt))
          .limit(perType)
      : Promise.resolve([]),

    canPermit
      ? db
          .select({
            id: workPermit.id,
            title: workPermit.title,
            status: workPermit.status,
            updatedAt: workPermit.updatedAt,
          })
          .from(workPermit)
          .where(eq(workPermit.organizationId, orgId))
          .orderBy(desc(workPermit.updatedAt))
          .limit(perType)
      : Promise.resolve([]),

    canObservation
      ? db
          .select({
            id: safetyObservation.id,
            summary: safetyObservation.summary,
            status: safetyObservation.status,
            updatedAt: safetyObservation.updatedAt,
          })
          .from(safetyObservation)
          .where(eq(safetyObservation.organizationId, orgId))
          .orderBy(desc(safetyObservation.updatedAt))
          .limit(perType)
      : Promise.resolve([]),

    canInspection
      ? db
          .select({
            id: inspection.id,
            title: inspection.title,
            status: inspection.status,
            scheduledAt: inspection.scheduledAt,
            updatedAt: inspection.updatedAt,
          })
          .from(inspection)
          .where(eq(inspection.organizationId, orgId))
          .orderBy(desc(inspection.updatedAt))
          .limit(perType)
      : Promise.resolve([]),

    canFinding
      ? db
          .select({
            id: auditFinding.id,
            title: auditFinding.title,
            findingType: auditFinding.findingType,
            createdAt: auditFinding.createdAt,
          })
          .from(auditFinding)
          .where(eq(auditFinding.organizationId, orgId))
          .orderBy(desc(auditFinding.createdAt))
          .limit(perType)
      : Promise.resolve([]),

    canRisk
      ? (async () => {
          const [row] = await db
            .select({ n: count() })
            .from(riskAssessment)
            .where(
              and(
                eq(riskAssessment.organizationId, orgId),
                isNotNull(riskAssessment.reviewDueAt),
                lt(riskAssessment.reviewDueAt, todayStart),
                inArray(riskAssessment.status, ["active", "under_review"]),
              ),
            );
          return { overdueReviewCount: Number(row?.n ?? 0) };
        })()
      : Promise.resolve(null),

    canEnvPermit
      ? (async () => {
          const permitHorizon = addDaysUtc(todayStart, 30);
          const [row] = await db
            .select({ n: count() })
            .from(environmentalRegulatoryPermit)
            .where(
              and(
                eq(environmentalRegulatoryPermit.organizationId, orgId),
                isNotNull(environmentalRegulatoryPermit.expiresAt),
                lte(environmentalRegulatoryPermit.expiresAt, permitHorizon),
                ne(environmentalRegulatoryPermit.status, "closed"),
              ),
            );
          return { renewalAttentionCount: Number(row?.n ?? 0) };
        })()
      : Promise.resolve(null),

    canRisk
      ? db
          .select({
            id: riskAssessment.id,
            summaryTitle: riskAssessment.summaryTitle,
            context: riskAssessment.context,
            assessmentKind: riskAssessment.assessmentKind,
            status: riskAssessment.status,
            reviewDueAt: riskAssessment.reviewDueAt,
            updatedAt: riskAssessment.updatedAt,
          })
          .from(riskAssessment)
          .where(eq(riskAssessment.organizationId, orgId))
          .orderBy(desc(riskAssessment.updatedAt))
          .limit(perType)
      : Promise.resolve([]),

    canEnvPermit
      ? db
          .select({
            id: environmentalRegulatoryPermit.id,
            title: environmentalRegulatoryPermit.title,
            status: environmentalRegulatoryPermit.status,
            expiresAt: environmentalRegulatoryPermit.expiresAt,
            updatedAt: environmentalRegulatoryPermit.updatedAt,
          })
          .from(environmentalRegulatoryPermit)
          .where(eq(environmentalRegulatoryPermit.organizationId, orgId))
          .orderBy(desc(environmentalRegulatoryPermit.updatedAt))
          .limit(perType)
      : Promise.resolve([]),
  ]);

  const activityFeed = buildSortedActivityFeed(
    {
      incidents: feedIncidents,
      capas: feedCapas,
      permits: feedPermits,
      observations: feedObservations,
      inspections: feedInspections,
      findings: feedFindings,
      riskAssessments: feedRiskAssessments,
      environmentalRegulatoryPermits: feedEnvironmentalPermits,
    },
    feedMax,
  );

  const programAutomation = await fetchProgramAutomationKpis(db, {
    organizationId: orgId,
    canObservation,
    canSeeApprovalEscalations: capaApprove || permitApprove || envPermitApprove,
    todayStart,
  });

  const cronHealth = canOrgAdmin ? await fetchCronHealthForAdmin(db) : null;

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      incidents: incidentsKpi,
      capas: capasKpi,
      environment: envKpi,
      fieldOperations: fieldOpsKpi,
      approvalsInbox: approvalsKpi,
      inspections: inspectionsKpi,
      tasksWorkbench: tasksKpi,
      auditFindings: findingsKpi,
      riskProgram: riskProgramKpi,
      environmentalPermits: environmentalPermitsKpi,
      programAutomation,
      cronHealth,
    },
    activityFeed,
  };
}
