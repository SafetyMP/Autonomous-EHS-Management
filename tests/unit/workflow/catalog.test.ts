import { describe, expect, it } from "vitest";
import { buildEncodedWorkflowCatalog } from "@/lib/workflow/catalog";

describe("buildEncodedWorkflowCatalog", () => {
  it("includes incident, inspection, capa, and work permit with non-empty transition lists", () => {
    const catalog = buildEncodedWorkflowCatalog();
    expect(catalog.version).toBe(1);
    expect(catalog.entities).toHaveLength(4);
    const byEntity = Object.fromEntries(catalog.entities.map((e) => [e.entity, e]));
    expect(byEntity.incident?.transitions.length).toBeGreaterThan(0);
    expect(byEntity.inspection?.transitions.length).toBeGreaterThan(0);
    expect(byEntity.corrective_action?.transitions.length).toBeGreaterThan(0);
    expect(byEntity.work_permit?.transitions.length).toBeGreaterThan(0);
    expect(byEntity.work_permit?.notes).toContain("approval");
  });

  it("includes expected incident edge open → investigating", () => {
    const catalog = buildEncodedWorkflowCatalog();
    const inc = catalog.entities.find((e) => e.entity === "incident");
    expect(inc?.transitions.some((t) => t.from === "open" && t.to === "investigating")).toBe(true);
  });
});
