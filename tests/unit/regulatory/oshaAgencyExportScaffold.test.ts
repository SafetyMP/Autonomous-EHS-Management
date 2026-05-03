import { describe, expect, it } from "vitest";
import { buildAgencyExportPlaceholder } from "@/lib/regulatory/oshaAgencyExportScaffold";

describe("buildAgencyExportPlaceholder", () => {
  it("returns not_implemented with disclaimer and columns", () => {
    const p = buildAgencyExportPlaceholder();
    expect(p.status).toBe("not_implemented");
    expect(p.disclaimer.length).toBeGreaterThan(40);
    expect(p.referenceColumns.length).toBeGreaterThan(3);
    expect(p.referenceColumns).toContain("days_away");
  });
});
