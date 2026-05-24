import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/root";

export type CommandCenterOut = inferRouterOutputs<AppRouter>["analytics"]["commandCenter"];
export type CommandCenterKpis = CommandCenterOut["kpis"];

/** Chips for automation escalation counts use this floor; KPI tiles still show raw counts. */
export const PROGRAM_AUTOMATION_ESCALATION_CHIP_MIN = 2;

const ATTENTION_CHIP_RULES: readonly {
  id: string;
  href: string;
  minCount: number;
  metric: (k: CommandCenterKpis) => number;
  label: (n: number) => string;
}[] = [
  {
    id: "attention-risk-review-overdue",
    href: "/dashboard/risk-assessments",
    minCount: 1,
    metric: (k) => k.riskProgram?.overdueReviewCount ?? 0,
    label: (n) => `${n} risk review(s) overdue`,
  },
  {
    id: "attention-env-permit-renewal",
    href: "/dashboard/environmental-permits",
    minCount: 1,
    metric: (k) => k.environmentalPermits?.renewalAttentionCount ?? 0,
    label: (n) => `${n} environmental permit(s) in 30d renewal window`,
  },
  {
    id: "attention-capa-overdue",
    href: "/dashboard/capa",
    minCount: 1,
    metric: (k) => k.capas?.overdueCount ?? 0,
    label: (n) => `${n} overdue CAPA`,
  },
  {
    id: "attention-audit-nc",
    href: "/dashboard/audits",
    minCount: 1,
    metric: (k) => k.auditFindings?.openNonConformanceCount ?? 0,
    label: (n) => `${n} open audit NC`,
  },
  {
    id: "attention-inspection-overdue",
    href: "/dashboard/inspections",
    minCount: 1,
    metric: (k) => k.inspections?.overdueScheduledCount ?? 0,
    label: (n) => `${n} overdue inspection`,
  },
  {
    id: "attention-approval-inbox",
    href: "/dashboard/approvals",
    minCount: 1,
    metric: (k) => k.approvalsInbox?.myPendingStepsCount ?? 0,
    label: (n) => `${n} approval step(s)`,
  },
  {
    id: "attention-observation-followup-overdue",
    href: "/dashboard/observations",
    minCount: 1,
    metric: (k) => k.fieldOperations?.observationFollowUpOverdueCount ?? 0,
    label: (n) => `${n} overdue observation follow-up`,
  },
  {
    id: "attention-permit-approval-pending",
    href: "/dashboard/approvals",
    minCount: 1,
    metric: (k) => k.fieldOperations?.pendingPermitApprovalCount ?? 0,
    label: (n) => `${n} permit approval chain(s)`,
  },
  {
    id: "attention-open-observations",
    href: "/dashboard/observations",
    minCount: 1,
    metric: (k) => k.fieldOperations?.nonClosedObservationCount ?? 0,
    label: (n) => `${n} open observation(s)`,
  },
  {
    id: "attention-program-auto-obs-escalations",
    href: "/dashboard/analytics#operations-sla-escalations",
    minCount: PROGRAM_AUTOMATION_ESCALATION_CHIP_MIN,
    metric: (k) => k.programAutomation?.observationFollowUpEscalationsRecorded90d ?? 0,
    label: (n) => `${n} observation SLA escalation(s) recorded (90d)`,
  },
  {
    id: "attention-program-auto-approval-escalations",
    href: "/dashboard/analytics#operations-sla-escalations",
    minCount: PROGRAM_AUTOMATION_ESCALATION_CHIP_MIN,
    metric: (k) => k.programAutomation?.approvalSlaEscalationsRecorded90d ?? 0,
    label: (n) => `${n} approval SLA escalation(s) recorded (90d)`,
  },
];

export function buildAttentionChips(
  k: CommandCenterOut["kpis"] | undefined,
): { id: string; label: string; href: string }[] {
  if (!k) return [];
  const chips: { id: string; label: string; href: string }[] = [];
  for (const rule of ATTENTION_CHIP_RULES) {
    const n = rule.metric(k);
    if (n >= rule.minCount) {
      chips.push({ id: rule.id, href: rule.href, label: rule.label(n) });
    }
  }
  return chips;
}

/** Chip ids suppressed when the same personal work appears in the action queue hero. */
const PERSONAL_WORK_CHIP_IDS = new Set([
  "attention-approval-inbox",
  "attention-permit-approval-pending",
]);

/**
 * Per action-queue spec §4.1: do not duplicate user-assigned items in attention chips
 * when they already appear in the personal work hero.
 */
export function filterAttentionChipsForActionQueue(
  chips: { id: string; label: string; href: string }[],
  actionQueueHasPersonalWork: boolean,
): { id: string; label: string; href: string }[] {
  if (!actionQueueHasPersonalWork) return chips;
  return chips.filter((c) => !PERSONAL_WORK_CHIP_IDS.has(c.id));
}

export const COMMAND_CENTER_KPI_TILES: readonly {
  key: string;
  title: string;
  href: string;
  value: (k: CommandCenterKpis | undefined) => number | string;
  emphasize?: (k: CommandCenterKpis | undefined) => boolean;
  sublabel?: (k: CommandCenterKpis | undefined) => string | undefined;
}[] = [
  {
    key: "inc-open",
    title: "Open incidents",
    href: "/dashboard/incidents",
    value: (k) => (k?.incidents ? k.incidents.openCount : "—"),
  },
  {
    key: "audit-nc",
    title: "Open audit NCs",
    href: "/dashboard/audits",
    value: (k) => (k?.auditFindings ? k.auditFindings.openNonConformanceCount : "—"),
    emphasize: (k) => (k?.auditFindings?.openNonConformanceCount ?? 0) > 0,
    sublabel: () => "Minor or major, not yet closed with verified CAPA",
  },
  {
    key: "capa-over",
    title: "Overdue CAPAs",
    href: "/dashboard/capa",
    value: (k) => (k?.capas ? k.capas.overdueCount : "—"),
    emphasize: (k) => (k?.capas?.overdueCount ?? 0) > 0,
  },
  {
    key: "aspects",
    title: "Environmental aspects",
    href: "/dashboard/environment",
    value: (k) => k?.environment?.aspectCount ?? "—",
  },
  {
    key: "oblig",
    title: "Compliance obligations",
    href: "/dashboard/environment",
    value: (k) => k?.environment?.obligationCount ?? "—",
    sublabel: (k) =>
      k?.environment?.obligationsReviewOverdue && k.environment.obligationsReviewOverdue > 0
        ? `${k.environment.obligationsReviewOverdue} review(s) overdue`
        : undefined,
  },
  {
    key: "risk-review",
    title: "Risk reviews overdue",
    href: "/dashboard/risk-assessments",
    value: (k) => (k?.riskProgram ? k.riskProgram.overdueReviewCount : "—"),
    emphasize: (k) => (k?.riskProgram?.overdueReviewCount ?? 0) > 0,
    sublabel: () => "Active / under review, past review due date (UTC day)",
  },
  {
    key: "env-permit-renewal",
    title: "Env permits (30d window)",
    href: "/dashboard/environmental-permits",
    value: (k) => (k?.environmentalPermits ? k.environmentalPermits.renewalAttentionCount : "—"),
    emphasize: (k) => (k?.environmentalPermits?.renewalAttentionCount ?? 0) > 0,
    sublabel: () => "Expires on or before 30 days (excludes closed)",
  },
  {
    key: "permits",
    title: "Active work permits",
    href: "/dashboard/permits",
    value: (k) => (k?.fieldOperations ? k.fieldOperations.activePermitsCount : "—"),
    emphasize: (k) =>
      (k?.fieldOperations?.pendingPermitApprovalCount ?? 0) > 0 ||
      (k?.fieldOperations?.activePermitsExpiringWithin7DaysCount ?? 0) > 0,
    sublabel: (k) => {
      const fo = k?.fieldOperations;
      if (!fo) return undefined;
      const parts: string[] = [];
      if (fo.pendingPermitApprovalCount > 0) {
        parts.push(`${fo.pendingPermitApprovalCount} approval chain(s)`);
      }
      if (fo.activePermitsExpiringWithin7DaysCount > 0) {
        parts.push(`${fo.activePermitsExpiringWithin7DaysCount} expiring in 7d`);
      }
      return parts.length ? parts.join(" · ") : undefined;
    },
  },
  {
    key: "obs",
    title: "Open observations",
    href: "/dashboard/observations",
    value: (k) => (k?.fieldOperations ? k.fieldOperations.nonClosedObservationCount : "—"),
    emphasize: (k) => (k?.fieldOperations?.observationFollowUpOverdueCount ?? 0) > 0,
    sublabel: (k) =>
      k?.fieldOperations && k.fieldOperations.observationFollowUpOverdueCount > 0
        ? `${k.fieldOperations.observationFollowUpOverdueCount} follow-up overdue`
        : undefined,
  },
  {
    key: "insp",
    title: "Overdue inspections",
    href: "/dashboard/inspections",
    value: (k) => (k?.inspections ? k.inspections.overdueScheduledCount : "—"),
    emphasize: (k) => (k?.inspections?.overdueScheduledCount ?? 0) > 0,
  },
  {
    key: "inbox",
    title: "Your approval inbox",
    href: "/dashboard/approvals",
    value: (k) => (k?.approvalsInbox ? k.approvalsInbox.myPendingStepsCount : "—"),
    emphasize: (k) => (k?.approvalsInbox?.myPendingStepsCount ?? 0) > 0,
  },
  {
    key: "bench",
    title: "Tasks workbench items",
    href: "/dashboard/tasks",
    value: (k) => (k?.tasksWorkbench ? k.tasksWorkbench.myOpenItemCount : "—"),
  },
  {
    key: "obs30",
    title: "Observations (30d)",
    href: "/dashboard/observations",
    value: (k) => (k?.fieldOperations ? k.fieldOperations.observationsLast30Days : "—"),
  },
  {
    key: "sla-esc-obs",
    title: "Observation SLA escalations (90d)",
    href: "/dashboard/observations",
    value: (k) => k?.programAutomation?.observationFollowUpEscalationsRecorded90d ?? "—",
    emphasize: (k) =>
      (k?.programAutomation?.observationFollowUpEscalationsRecorded90d ?? 0) > 0,
    sublabel: () => "Recorded when follow-up due dates pass—humans own closure",
  },
  {
    key: "sla-esc-appr",
    title: "Approval SLA escalations (90d)",
    href: "/dashboard/approvals",
    value: (k) => k?.programAutomation?.approvalSlaEscalationsRecorded90d ?? "—",
    emphasize: (k) => (k?.programAutomation?.approvalSlaEscalationsRecorded90d ?? 0) > 0,
    sublabel: () => "Recorded when steps breach SLA—not auto-approved",
  },
];
