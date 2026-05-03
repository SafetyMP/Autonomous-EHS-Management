import { describe, expect, it } from "vitest";
import { buildApprovalStepDueDates } from "@/server/services/approvalDueDates";

describe("buildApprovalStepDueDates", () => {
  it("staggers due dates by sla days", () => {
    const base = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
    const dates = buildApprovalStepDueDates(base, 3, 7);
    expect(dates).toHaveLength(3);
    expect(dates[0]!.getUTCDate()).toBe(8);
    expect(dates[1]!.getUTCDate()).toBe(15);
    expect(dates[2]!.getUTCDate()).toBe(22);
  });
});
