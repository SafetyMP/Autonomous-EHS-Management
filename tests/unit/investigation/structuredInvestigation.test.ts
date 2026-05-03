import { describe, expect, it } from "vitest";
import {
  finalizeInvestigationBowTieForStore,
  investigationBowTieInputSchema,
  investigationChronologyStepsSchema,
  investigationChronologyUpdateSchema,
  normalizeInvestigationBowTieForStore,
  normalizeInvestigationChronologyForStore,
} from "@/lib/investigation/structuredInvestigation";

describe("structuredInvestigation", () => {
  it("normalizeInvestigationBowTieForStore trims and drops empty threat paths", () => {
    const n = normalizeInvestigationBowTieForStore(
      investigationBowTieInputSchema.parse({
        topEvent: "  Release ",
        threats: [
          {
            description: " Corrosion ",
            preventiveBarriers: [
              { description: "  Inspection ", outcome: "effective" },
              { description: " ", outcome: "unknown" },
            ],
          },
          { description: "", preventiveBarriers: [] },
        ],
        consequences: [{ description: "Env harm", mitigativeBarriers: [] }],
        notes: null,
      }),
    );
    expect(n.topEvent).toBe("Release");
    expect(n.threats).toHaveLength(1);
    expect(n.threats[0]!.preventiveBarriers).toHaveLength(1);
    expect(n.threats[0]!.preventiveBarriers[0]!.description).toBe("Inspection");
  });

  it("finalizeInvestigationBowTieForStore returns null when empty", () => {
    expect(
      finalizeInvestigationBowTieForStore(
        investigationBowTieInputSchema.parse({
          topEvent: "",
          threats: [],
          consequences: [],
          notes: null,
        }),
      ),
    ).toBeNull();
  });

  it("investigationChronologyStepsSchema rejects duplicate sortOrder", () => {
    expect(() =>
      investigationChronologyStepsSchema.parse([
        { sortOrder: 0, description: "a" },
        { sortOrder: 0, description: "b" },
      ]),
    ).toThrow();
  });

  it("normalizeInvestigationChronologyForStore sorts and reindexes", () => {
    const out = normalizeInvestigationChronologyForStore([
      { sortOrder: 2, occurredAt: null, description: "second" },
      { sortOrder: 0, occurredAt: null, description: "first" },
    ]);
    expect(out.map((x) => x.description)).toEqual(["first", "second"]);
    expect(out.map((x) => x.sortOrder)).toEqual([0, 1]);
  });

  it("investigationChronologyUpdateSchema accepts null", () => {
    expect(investigationChronologyUpdateSchema.parse(null)).toBeNull();
  });
});
