import { describe, expect, it } from "vitest";
import type { Db } from "@/server/db";
import {
  establishmentMonthMetrics,
  establishmentYearMetrics,
} from "@/server/db/schema";
import {
  TRIR_FORMULA_VERSION,
  computeEffectiveHoursWorked,
  computeTrirRate,
  hashTrirInputs,
} from "@/server/services/complianceMetricTrir";

function createHoursRollupFakeDb(opts: {
  monthRows: Array<{
    establishmentId: string;
    calendarMonth: number;
    hoursWorked: number | null;
  }>;
  yearRows: Array<{
    establishmentId: string;
    totalHoursWorked: number | null;
  }>;
}): Db {
  const monthResolved = Promise.resolve(opts.monthRows);
  const yearResolved = Promise.resolve(opts.yearRows);

  return {
    select() {
      return {
        from(table: unknown) {
          if (table === establishmentMonthMetrics) {
            return {
              where() {
                return monthResolved;
              },
            };
          }
          if (table === establishmentYearMetrics) {
            return {
              where() {
                return yearResolved;
              },
            };
          }
          throw new Error(`[hours-rollup fake] unsupported table`);
        },
      };
    },
  } as unknown as Db;
}

describe("complianceMetricTrir", () => {
  it("computes TRIR with OSHA 200k base", () => {
    const r = computeTrirRate(2, 200_000);
    expect(r).toBeCloseTo(2, 5);
  });

  it("returns null when hours are zero", () => {
    expect(computeTrirRate(1, 0)).toBeNull();
  });

  it("hashes inputs deterministically", () => {
    const inputs = {
      calendarYear: 2025,
      organizationId: "00000000-0000-4000-8000-000000000001",
      establishmentId: null,
      recordableCount: 1,
      hoursWorked: 100_000,
      citation: "test",
      hoursSource: "annual_year_metrics" as const,
      partialMonthlyCoverageWarning: false,
      monthMetricsRowCount: 0,
    };
    expect(hashTrirInputs(inputs)).toHaveLength(64);
    expect(hashTrirInputs(inputs)).toBe(hashTrirInputs(inputs));
    expect(hashTrirInputs({ ...inputs, recordableCount: 2 })).not.toBe(hashTrirInputs(inputs));
  });

  it("embeds formula version constant", () => {
    expect(TRIR_FORMULA_VERSION).toBe(2);
  });

  describe("computeEffectiveHoursWorked", () => {
    const est = "00000000-0000-4000-8000-0000000000aa";

    it("returns zeros when establishmentIds is empty", async () => {
      const db = createHoursRollupFakeDb({ monthRows: [], yearRows: [] });
      await expect(computeEffectiveHoursWorked(db, [], 2026)).resolves.toEqual({
        hoursWorked: 0,
        hoursSource: "annual_year_metrics",
        partialMonthlyCoverageWarning: false,
        monthMetricsRowCount: 0,
      });
    });

    it("uses the annual total when the month grid is incomplete", async () => {
      const db = createHoursRollupFakeDb({
        monthRows: [
          { establishmentId: est, calendarMonth: 1, hoursWorked: 20_000 },
          { establishmentId: est, calendarMonth: 2, hoursWorked: 20_000 },
          { establishmentId: est, calendarMonth: 3, hoursWorked: 20_000 },
        ],
        yearRows: [{ establishmentId: est, totalHoursWorked: 285_000 }],
      });
      await expect(computeEffectiveHoursWorked(db, [est], 2026)).resolves.toEqual({
        hoursWorked: 285_000,
        hoursSource: "annual_year_metrics",
        partialMonthlyCoverageWarning: true,
        monthMetricsRowCount: 3,
      });
    });

    it("does not treat a partial month grid as the annual denominator when no annual total exists", async () => {
      const db = createHoursRollupFakeDb({
        monthRows: [{ establishmentId: est, calendarMonth: 1, hoursWorked: 20_000 }],
        yearRows: [],
      });
      await expect(computeEffectiveHoursWorked(db, [est], 2026)).resolves.toEqual({
        hoursWorked: 0,
        hoursSource: "annual_year_metrics",
        partialMonthlyCoverageWarning: true,
        monthMetricsRowCount: 1,
      });
    });

    it("uses annual year metrics when no month rows exist", async () => {
      const db = createHoursRollupFakeDb({
        monthRows: [],
        yearRows: [{ establishmentId: est, totalHoursWorked: 100_000 }],
      });
      await expect(computeEffectiveHoursWorked(db, [est], 2026)).resolves.toEqual({
        hoursWorked: 100_000,
        hoursSource: "annual_year_metrics",
        partialMonthlyCoverageWarning: false,
        monthMetricsRowCount: 0,
      });
    });

    it("does not warn when 12 distinct months all have hours values", async () => {
      const monthRows = Array.from({ length: 12 }, (_, i) => ({
        establishmentId: est,
        calendarMonth: i + 1,
        hoursWorked: 1000,
      }));
      const db = createHoursRollupFakeDb({
        monthRows,
        yearRows: [{ establishmentId: est, totalHoursWorked: 99_999 }],
      });
      await expect(computeEffectiveHoursWorked(db, [est], 2026)).resolves.toMatchObject({
        hoursWorked: 12_000,
        hoursSource: "monthly_roll_up",
        partialMonthlyCoverageWarning: false,
        monthMetricsRowCount: 12,
      });
    });

    it("uses each establishment's annual total when one of them has only a partial month grid", async () => {
      const estB = "00000000-0000-4000-8000-0000000000bb";
      const db = createHoursRollupFakeDb({
        monthRows: [{ establishmentId: est, calendarMonth: 1, hoursWorked: 10_000 }],
        yearRows: [
          { establishmentId: est, totalHoursWorked: 50_000 },
          { establishmentId: estB, totalHoursWorked: 40_000 },
        ],
      });
      await expect(computeEffectiveHoursWorked(db, [est, estB], 2026)).resolves.toEqual({
        hoursWorked: 90_000,
        hoursSource: "annual_year_metrics",
        partialMonthlyCoverageWarning: true,
        monthMetricsRowCount: 1,
      });
    });

    it("marks mixed when one establishment has a full month grid and another has only an annual total", async () => {
      const estB = "00000000-0000-4000-8000-0000000000bb";
      const monthRows = Array.from({ length: 12 }, (_, i) => ({
        establishmentId: est,
        calendarMonth: i + 1,
        hoursWorked: 1_000,
      }));
      const db = createHoursRollupFakeDb({
        monthRows,
        yearRows: [{ establishmentId: estB, totalHoursWorked: 40_000 }],
      });
      await expect(computeEffectiveHoursWorked(db, [est, estB], 2026)).resolves.toEqual({
        hoursWorked: 52_000,
        hoursSource: "mixed",
        partialMonthlyCoverageWarning: false,
        monthMetricsRowCount: 12,
      });
    });
  });
});
