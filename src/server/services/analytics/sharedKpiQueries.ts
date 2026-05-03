import { and, count, eq, gte, inArray, isNotNull, isNull, lt, lte, ne, or } from "drizzle-orm";
import { addDaysUtc } from "@/lib/analytics/safetyDashboardKpis";
import type { Db } from "@/server/db";
import {
  approvalRequest,
  auditFinding,
  complianceObligation,
  correctiveAction,
  environmentalAspect,
  safetyObservation,
  workPermit,
} from "@/server/db/schema";

export type EnvironmentKpiSnapshot = {
  aspectCount: number | null;
  obligationCount: number | null;
  obligationsReviewOverdue: number | null;
};

export type FieldOperationsKpiSnapshot = {
  activePermitsCount: number;
  pendingPermitApprovalCount: number;
  nonClosedObservationCount: number;
  observationsLast30Days: number;
  /** Open/ack observations with past-due follow-up (SLA-facing; program analytics — not OSHA). */
  observationFollowUpOverdueCount: number;
  /** Active permits whose validTo is within the next 7 UTC days from todayStart’s calendar day start. */
  activePermitsExpiringWithin7DaysCount: number;
  /** Observation volume for at-risk behaviors + unsafe conditions in trailing 90d (leading indicators). */
  atRiskObservationCountLast90Days: number;
};

/** Aspect / obligation counts for dashboards; respects permission flags. */
export async function fetchEnvironmentKpiSnapshot(
  db: Db,
  organizationId: string,
  flags: { canAspect: boolean; canObligation: boolean },
  todayStart: Date,
): Promise<EnvironmentKpiSnapshot> {
  let aspectCount: number | null = null;
  if (flags.canAspect) {
    const [a] = await db
      .select({ n: count() })
      .from(environmentalAspect)
      .where(eq(environmentalAspect.organizationId, organizationId));
    aspectCount = Number(a?.n ?? 0);
  }

  let obligationCount: number | null = null;
  let obligationsReviewOverdue: number | null = null;
  if (flags.canObligation) {
    const [o] = await db
      .select({ n: count() })
      .from(complianceObligation)
      .where(eq(complianceObligation.organizationId, organizationId));
    obligationCount = Number(o?.n ?? 0);

    const [od] = await db
      .select({ n: count() })
      .from(complianceObligation)
      .where(
        and(
          eq(complianceObligation.organizationId, organizationId),
          isNotNull(complianceObligation.nextReviewDue),
          lt(complianceObligation.nextReviewDue, todayStart),
        ),
      );
    obligationsReviewOverdue = Number(od?.n ?? 0);
  }

  return { aspectCount, obligationCount, obligationsReviewOverdue };
}

/** Permits + observations field KPIs; respects permission flags. */
export async function fetchFieldOperationsKpiSnapshot(
  db: Db,
  organizationId: string,
  flags: { canPermit: boolean; canObservation: boolean },
  todayStart: Date,
): Promise<FieldOperationsKpiSnapshot> {
  const horizon30 = addDaysUtc(todayStart, -30);
  const horizon90 = addDaysUtc(todayStart, -90);
  const permitWeekEnd = addDaysUtc(todayStart, 7);
  const overdueAsOf = new Date();
  let activePermitsCount = 0;
  let pendingPermitApprovalCount = 0;
  let nonClosedObservationCount = 0;
  let observationsLast30Days = 0;
  let observationFollowUpOverdueCount = 0;
  let activePermitsExpiringWithin7DaysCount = 0;
  let atRiskObservationCountLast90Days = 0;

  if (flags.canPermit) {
    const [activeRow] = await db
      .select({ n: count() })
      .from(workPermit)
      .where(and(eq(workPermit.organizationId, organizationId), eq(workPermit.status, "active")));
    activePermitsCount = Number(activeRow?.n ?? 0);

    const [pendRow] = await db
      .select({ n: count() })
      .from(approvalRequest)
      .where(
        and(
          eq(approvalRequest.organizationId, organizationId),
          eq(approvalRequest.entityType, "work_permit"),
          eq(approvalRequest.status, "open"),
        ),
      );
    pendingPermitApprovalCount = Number(pendRow?.n ?? 0);

    const [exp7] = await db
      .select({ n: count() })
      .from(workPermit)
      .where(
        and(
          eq(workPermit.organizationId, organizationId),
          eq(workPermit.status, "active"),
          gte(workPermit.validTo, todayStart),
          lte(workPermit.validTo, permitWeekEnd),
        ),
      );
    activePermitsExpiringWithin7DaysCount = Number(exp7?.n ?? 0);
  }

  if (flags.canObservation) {
    const [openObs] = await db
      .select({ n: count() })
      .from(safetyObservation)
      .where(
        and(
          eq(safetyObservation.organizationId, organizationId),
          inArray(safetyObservation.status, ["open", "acknowledged"]),
        ),
      );
    nonClosedObservationCount = Number(openObs?.n ?? 0);

    const [o30] = await db
      .select({ n: count() })
      .from(safetyObservation)
      .where(
        and(
          eq(safetyObservation.organizationId, organizationId),
          gte(safetyObservation.observedAt, horizon30),
        ),
      );
    observationsLast30Days = Number(o30?.n ?? 0);

    const [overdueFu] = await db
      .select({ n: count() })
      .from(safetyObservation)
      .where(
        and(
          eq(safetyObservation.organizationId, organizationId),
          inArray(safetyObservation.status, ["open", "acknowledged"]),
          isNotNull(safetyObservation.followUpDueAt),
          lt(safetyObservation.followUpDueAt, overdueAsOf),
        ),
      );
    observationFollowUpOverdueCount = Number(overdueFu?.n ?? 0);

    const [atRisk90] = await db
      .select({ n: count() })
      .from(safetyObservation)
      .where(
        and(
          eq(safetyObservation.organizationId, organizationId),
          inArray(safetyObservation.category, ["at_risk_behavior", "unsafe_condition"]),
          gte(safetyObservation.observedAt, horizon90),
        ),
      );
    atRiskObservationCountLast90Days = Number(atRisk90?.n ?? 0);
  }

  return {
    activePermitsCount,
    pendingPermitApprovalCount,
    nonClosedObservationCount,
    observationsLast30Days,
    observationFollowUpOverdueCount: flags.canObservation ? observationFollowUpOverdueCount : 0,
    activePermitsExpiringWithin7DaysCount: flags.canPermit
      ? activePermitsExpiringWithin7DaysCount
      : 0,
    atRiskObservationCountLast90Days: flags.canObservation ? atRiskObservationCountLast90Days : 0,
  };
}

/** Minor/major NCs not closed with verified CAPA (same join as legacy dashboards). */
export async function countOpenAuditNonConformances(db: Db, organizationId: string): Promise<number> {
  const [openNc] = await db
    .select({ n: count() })
    .from(auditFinding)
    .leftJoin(correctiveAction, eq(auditFinding.correctiveActionId, correctiveAction.id))
    .where(
      and(
        eq(auditFinding.organizationId, organizationId),
        inArray(auditFinding.findingType, ["minor_nc", "major_nc"]),
        or(isNull(correctiveAction.id), ne(correctiveAction.status, "verified")),
      ),
    );
  return Number(openNc?.n ?? 0);
}
