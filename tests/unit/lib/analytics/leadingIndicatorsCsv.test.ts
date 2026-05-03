import { describe, expect, it } from "vitest";
import { leadingIndicatorsToCsv } from "@/lib/analytics/leadingIndicatorsCsv";

describe("leadingIndicatorsToCsv", () => {
  it("emits supervisory metrics and cluster rows", () => {
    const csv = leadingIndicatorsToCsv({
      generatedAt: "2026-04-01T00:00:00.000Z",
      trailingDays: 90,
      overdueObservationFollowUps: 2,
      observationsLinkedToCapaInWindow: 5,
      repeatObservationClusters: [
        {
          siteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          category: "unsafe_condition",
          observationCount: 3,
        },
      ],
      observationsLinkedToVerifiedCapaInWindow: 1,
    });
    expect(csv).toContain("generatedAt");
    expect(csv).toContain("supervisory");
    expect(csv).toContain("unsafe_condition");
    expect(csv.split("\r\n").length).toBeGreaterThanOrEqual(4);
  });
});
