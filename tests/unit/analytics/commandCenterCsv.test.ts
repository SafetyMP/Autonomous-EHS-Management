import { describe, expect, it } from "vitest";
import { commandCenterSnapshotToCsv } from "@/lib/analytics/commandCenterCsv";
import type { CommandCenterSnapshot } from "@/lib/analytics/commandCenterCsv";

describe("commandCenterSnapshotToCsv", () => {
  it("writes meta row and KPI sections", () => {
    const snap: CommandCenterSnapshot = {
      generatedAt: "2026-01-05T12:00:00.000Z",
      kpis: {
        incidents: { openCount: 3 },
        capas: { overdueCount: 1 },
        environment: null,
        fieldOperations: null,
        approvalsInbox: null,
        inspections: null,
        tasksWorkbench: null,
        auditFindings: null,
        riskProgram: null,
        environmentalPermits: null,
        contractorCompliance: null,
        integrationHealth: null,
        programAutomation: {
          observationFollowUpEscalationsRecorded90d: null,
          approvalSlaEscalationsRecorded90d: null,
        },
        cronHealth: null,
      },
      activityFeed: [],
    };
    const csv = commandCenterSnapshotToCsv(snap);
    expect(csv).toContain("generatedAt");
    expect(csv).toContain("incidents");
    expect(csv).toContain("openCount");
  });
});
