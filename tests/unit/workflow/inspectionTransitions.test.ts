import { describe, expect, it } from "vitest";
import { allowedInspectionTransition } from "@/lib/workflow/inspectionTransitions";

describe("allowedInspectionTransition", () => {
  it("allows scheduled → in_progress and cancelled", () => {
    expect(allowedInspectionTransition("scheduled", "in_progress")).toBe(true);
    expect(allowedInspectionTransition("scheduled", "cancelled")).toBe(true);
    expect(allowedInspectionTransition("scheduled", "completed")).toBe(false);
  });

  it("blocks transitions from terminal states", () => {
    expect(allowedInspectionTransition("completed", "scheduled")).toBe(false);
    expect(allowedInspectionTransition("cancelled", "in_progress")).toBe(false);
  });
});
