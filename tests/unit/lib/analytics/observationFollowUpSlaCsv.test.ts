import { describe, expect, it } from "vitest";
import { observationFollowUpSlaToCsv } from "@/lib/analytics/observationFollowUpSlaCsv";

describe("observationFollowUpSlaToCsv", () => {
  it("includes rollups and sample rows", () => {
    const d = new Date("2026-05-03T14:30:00.000Z");
    const csv = observationFollowUpSlaToCsv({
      generatedAt: d.toISOString(),
      overdueFollowUpCount: 2,
      followUpDueWithin7DaysCount: 3,
      openObservationWithFollowUpCount: 5,
      observationEscalationsLast90Days: 1,
      overdueSamples: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          summary: `Line, with "quotes"`,
          status: "open",
          followUpDueAt: d,
          assigneeUserId: "user1",
        },
      ],
    });
    expect(csv).toContain("rollup,overdueFollowUpCount,2");
    expect(csv).toContain("sample_overdue");
    expect(csv).toContain("quotes");
  });
});
