import { describe, expect, it } from "vitest";
import {
  REFERENCE_COLUMNS_300_STYLE,
  buildOshaAgencyReferenceCsvSample,
} from "@/lib/regulatory/oshaAgencyExportScaffold";

describe("buildOshaAgencyReferenceCsvSample", () => {
  it("includes all reference columns in header order", () => {
    const csv = buildOshaAgencyReferenceCsvSample();
    const [header] = csv.trim().split("\n");
    expect(header).toBe(REFERENCE_COLUMNS_300_STYLE.join(","));
  });

  it("has exactly two lines and no obvious PII in synthetic example", () => {
    const csv = buildOshaAgencyReferenceCsvSample();
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/);
    expect(lines[1]).not.toMatch(/@/);
  });
});
