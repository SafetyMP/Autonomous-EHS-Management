import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CorporateOverviewSummary } from "@/components/dashboard/corporate-overview-summary";
import type { CommandCenterOut } from "@/lib/dashboard/commandCenterSignals";

function snapshotWith(kpis: Partial<CommandCenterOut["kpis"]> = {}): CommandCenterOut {
  return {
    generatedAt: "2026-11-14T12:00:00.000Z",
    activityFeed: [],
    kpis: {
      incidents: null,
      capas: null,
      auditFindings: null,
      approvalsInbox: null,
      environment: null,
      fieldOperations: null,
      inspections: null,
      tasksWorkbench: null,
      riskProgram: null,
      environmentalPermits: null,
      contractorCompliance: null,
      integrationHealth: null,
      cronHealth: null,
      programAutomation: {
        observationFollowUpEscalationsRecorded90d: null,
        approvalSlaEscalationsRecorded90d: null,
      },
      ...kpis,
    },
  };
}

function renderSummary(snapshot: CommandCenterOut | undefined) {
  return renderToStaticMarkup(createElement(CorporateOverviewSummary, { snapshot }));
}

function measures(markup: string) {
  return [...markup.matchAll(/<dt[^>]*>([^<]*)<\/dt><dd[^>]*>([^<]*)<\/dd><dd[^>]*>([^<]*)<\/dd>/g)]
    .map((match) => ({ label: match[1], value: match[2], detail: match[3] }));
}

describe("corporate overview summary", () => {
  it("shows exactly four named measures from the scoped snapshot", () => {
    const container = renderSummary(snapshotWith({
      incidents: { openCount: 7 },
      capas: { overdueCount: 3 },
      auditFindings: { openNonConformanceCount: 2 },
      approvalsInbox: { myPendingStepsCount: 1 },
    }));
    expect(measures(container)).toEqual([
      { label: "Open incidents", value: "7", detail: "Awaiting closure" },
      { label: "Overdue corrective actions", value: "3", detail: "Past their due date" },
      { label: "Open audit findings", value: "2", detail: "Nonconformances to resolve" },
      { label: "Your pending approvals", value: "1", detail: "Decisions assigned to you" },
    ]);
    expect(container).toContain('aria-label="Organization at a glance"');
  });

  it.each([
    ["missing snapshot", undefined],
    ["permission-limited snapshot", snapshotWith()],
  ] as const)("does not invent zeros for a %s", (_name, snapshot) => {
    const rows = measures(renderSummary(snapshot));
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.value === "—")).toBe(true);
    expect(rows.every((row) => row.detail === "Not available in this view")).toBe(true);
  });

  it("distinguishes a genuine zero from a measure the caller cannot read", () => {
    const rows = measures(renderSummary(snapshotWith({ incidents: { openCount: 0 } })));
    expect(rows[0]).toEqual({ label: "Open incidents", value: "0", detail: "Awaiting closure" });
    expect(rows.slice(1).every((row) => row.value === "—")).toBe(true);
    expect(rows.slice(1).every((row) => row.detail === "Not available in this view")).toBe(true);
  });

  it("does not present absent or zero corrective actions as overdue", () => {
    for (const snapshot of [undefined, snapshotWith(), snapshotWith({ capas: { overdueCount: 0 } })]) {
      expect(renderSummary(snapshot)).not.toContain("text-warning");
    }
    expect(renderSummary(snapshotWith({ capas: { overdueCount: 2 } }))).toMatch(/<dd[^>]*text-warning[^>]*>2<\/dd>/);
  });
});
