import { describe, expect, it } from "vitest";
import {
  buildAttentionChips,
  filterAttentionChipsForActionQueue,
} from "@/lib/dashboard/commandCenterSignals";
import { filterDashboardNavSections, navSectionsForUser } from "@/lib/dashboard-nav-filter";
import { DASHBOARD_NAV_SECTIONS } from "@/lib/dashboard-nav-links";

describe("filterAttentionChipsForActionQueue", () => {
  it("removes personal approval chips when action queue has items", () => {
    const chips = buildAttentionChips({
      approvalsInbox: { myPendingStepsCount: 2 },
      capas: { overdueCount: 0 },
      auditFindings: { openNonConformanceCount: 0 },
      inspections: { overdueScheduledCount: 0 },
      environment: { aspectCount: 0, obligationCount: 0, obligationsReviewOverdue: 0 },
      riskProgram: { overdueReviewCount: 0 },
      environmentalPermits: { renewalAttentionCount: 0 },
      fieldOperations: {
        activePermitsCount: 0,
        pendingPermitApprovalCount: 1,
        activePermitsExpiringWithin7DaysCount: 0,
        nonClosedObservationCount: 0,
        observationFollowUpOverdueCount: 0,
        observationsLast30Days: 0,
      },
      tasksWorkbench: { myOpenItemCount: 0 },
      programAutomation: {
        observationFollowUpEscalationsRecorded90d: 0,
        approvalSlaEscalationsRecorded90d: 0,
      },
      incidents: { openCount: 0 },
    } as Parameters<typeof buildAttentionChips>[0]);

    const filtered = filterAttentionChipsForActionQueue(chips, true);
    expect(filtered.some((c) => c.id === "attention-approval-inbox")).toBe(false);
    expect(filtered.some((c) => c.id === "attention-permit-approval-pending")).toBe(false);
  });
});

describe("filterDashboardNavSections", () => {
  it("hides management system for field-focused users without admin/integration/audit", () => {
    const filtered = filterDashboardNavSections(DASHBOARD_NAV_SECTIONS, {
      layout: "field",
      isAdmin: false,
      canIntegrationRead: false,
      canAuditTrailRead: false,
    });
    expect(filtered.some((s) => s.title === "Administration")).toBe(false);
    expect(filtered.some((s) => s.title === "Plan & programme")).toBe(true);
    const flat = filtered.flatMap((s) => s.items);
    expect(flat.some((i) => i.href === "/dashboard/heat-program")).toBe(true);
    expect(flat.some((i) => i.href === "/dashboard/chemicals")).toBe(true);
    expect(flat.length).toBeLessThanOrEqual(28);
  });

  it("keeps management system for org admins", () => {
    const filtered = navSectionsForUser({
      layout: "field",
      isAdmin: true,
      canIntegrationRead: false,
      canAuditTrailRead: false,
    });
    expect(filtered.some((s) => s.title === "Administration")).toBe(true);
  });
});
