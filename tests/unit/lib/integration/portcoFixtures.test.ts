import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { integrationInboundSchema } from "@/lib/integration/inboundEnvelope";

const fixtureDir = resolve(process.cwd(), "tests/fixtures/integration");

describe("PortCo iPaaS HRIS fixtures", () => {
  it("validates Workday sample payload", () => {
    const raw = JSON.parse(readFileSync(resolve(fixtureDir, "workday-hris-sync.json"), "utf8"));
    const parsed = integrationInboundSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.kind === "hris_membership_sync") {
      expect(parsed.data.externalWorkerId).toBe("WD-10482");
    }
  });

  it("validates ADP sample payload", () => {
    const raw = JSON.parse(readFileSync(resolve(fixtureDir, "adp-hris-sync.json"), "utf8"));
    const parsed = integrationInboundSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });

  it("validates BambooHR sample payload", () => {
    const raw = JSON.parse(readFileSync(resolve(fixtureDir, "bamboohr-hris-sync.json"), "utf8"));
    const parsed = integrationInboundSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.kind === "hris_membership_sync") {
      expect(parsed.data.externalWorkerId).toBe("BHR-90210");
    }
  });

  it("validates HRIS contractor sync sample payload", () => {
    const raw = JSON.parse(readFileSync(resolve(fixtureDir, "hris-contractor-sync.json"), "utf8"));
    const parsed = integrationInboundSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success && parsed.data.kind === "hris_contractor_sync") {
      expect(parsed.data.externalWorkerId).toBe("VMS-C-4401");
    }
  });
});
