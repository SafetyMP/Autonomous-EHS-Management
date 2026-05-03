import { utcStartOfDay } from "@/lib/analytics/safetyDashboardKpis";
import type { Db } from "@/server/db";
import {
  fetchCronHealthForAdmin,
  fetchProgramAutomationKpis,
} from "@/server/services/analytics/operationsAutonomyKpis";

export type OperationsAutonomyPermissionFlags = {
  canObservation: boolean;
  capaApprove: boolean;
  permitApprove: boolean;
  envPermitApprove: boolean;
  canOrgAdmin: boolean;
};

export async function executeOperationsAutonomyQuery(
  db: Db,
  organizationId: string,
  permissions: OperationsAutonomyPermissionFlags,
) {
  const todayStart = utcStartOfDay(new Date());
  const {
    canObservation,
    capaApprove,
    permitApprove,
    envPermitApprove,
    canOrgAdmin,
  } = permissions;

  const programAutomation = await fetchProgramAutomationKpis(db, {
    organizationId,
    canObservation,
    canSeeApprovalEscalations: capaApprove || permitApprove || envPermitApprove,
    todayStart,
  });

  const cronHealth = canOrgAdmin ? await fetchCronHealthForAdmin(db) : null;

  return {
    disclaimer:
      "Escalation counts are records written when SLAs breach—they do not auto-approve work. Cron health is deployment-wide (latest run per job key); org admins can review it here—pair with docs/runbooks/cron-metrics-observability.md.",
    programAutomation,
    cronHealth,
  };
}
