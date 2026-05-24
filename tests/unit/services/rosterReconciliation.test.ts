import { describe, expect, it } from "vitest";
import { computeRosterDrift } from "@/server/services/rosterReconciliation";

describe("computeRosterDrift", () => {
  it("flags HRIS workers missing from EHS", async () => {
    const db = {
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            where: async () => [
              {
                email: "existing@portco.example",
                externalWorkerId: "E-1",
                lifecycleStatus: "active" as const,
              },
            ],
          }),
        }),
      }),
    };

    const drift = await computeRosterDrift(db as never, "00000000-0000-4000-8000-000000000001", [
      { workerEmail: "existing@portco.example", externalWorkerId: "E-1" },
      { workerEmail: "missing@portco.example", externalWorkerId: "M-1" },
    ]);

    expect(drift.some((d) => d.reason === "in_hris_not_in_ehs" && d.workerEmail === "missing@portco.example")).toBe(
      true,
    );
    expect(drift.some((d) => d.reason === "in_ehs_not_in_hris")).toBe(false);
  });
});
