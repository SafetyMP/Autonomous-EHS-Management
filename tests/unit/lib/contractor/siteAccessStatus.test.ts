import { describe, expect, it } from "vitest";
import { computePartyComplianceSummary } from "@/lib/contractor/siteAccessStatus";

const now = new Date("2026-05-24T12:00:00.000Z");

describe("computePartyComplianceSummary", () => {
  it("blocks contractor with no credentials", () => {
    const summary = computePartyComplianceSummary("contractor", [], now);
    expect(summary.siteAccessBlocked).toBe(true);
    expect(summary.siteAccessStatus).toBe("blocked");
    expect(summary.reasons).toContain("No credentials on file");
  });

  it("blocks when COI is missing despite other credentials", () => {
    const summary = computePartyComplianceSummary(
      "contractor",
      [{ kind: "training_proof", status: "active", validTo: new Date("2027-01-01") }],
      now,
    );
    expect(summary.siteAccessBlocked).toBe(true);
    expect(summary.reasons.some((r) => r.includes("certificate of insurance"))).toBe(true);
  });

  it("clears contractor with active COI", () => {
    const summary = computePartyComplianceSummary(
      "contractor",
      [{ kind: "insurance_coi", status: "active", validTo: new Date("2027-01-01") }],
      now,
    );
    expect(summary.siteAccessStatus).toBe("cleared");
    expect(summary.siteAccessBlocked).toBe(false);
  });

  it("blocks on expired credential", () => {
    const summary = computePartyComplianceSummary(
      "contractor",
      [{ kind: "insurance_coi", status: "active", validTo: new Date("2026-01-01") }],
      now,
    );
    expect(summary.siteAccessBlocked).toBe(true);
    expect(summary.expiredCredentialCount).toBe(1);
  });
});
