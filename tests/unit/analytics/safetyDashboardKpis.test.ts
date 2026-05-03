import { describe, expect, it } from "vitest";
import {
  addDaysUtc,
  computeCapaSafetyBlock,
  computeIncidentSafetyBlock,
  trailingMonthKeys,
  utcStartOfDay,
} from "@/lib/analytics/safetyDashboardKpis";

describe("trailingMonthKeys", () => {
  it("returns `trailing` keys ending at anchor month", () => {
    const anchor = new Date(Date.UTC(2026, 5, 15));
    expect(trailingMonthKeys(3, anchor)).toEqual(["2026-04", "2026-05", "2026-06"]);
  });
});

describe("utcStartOfDay / addDaysUtc", () => {
  it("normalizes to UTC midnight and adds whole days", () => {
    const d = new Date(Date.UTC(2026, 5, 15, 22, 30, 1));
    expect(utcStartOfDay(d).toISOString()).toBe("2026-06-15T00:00:00.000Z");
    expect(addDaysUtc(utcStartOfDay(d), 30).toISOString()).toBe("2026-07-15T00:00:00.000Z");
  });
});

describe("computeIncidentSafetyBlock", () => {
  const monthLabels = ["2026-05", "2026-06"];

  it("aggregates status, type, month buckets, and near-miss open count", () => {
    const out = computeIncidentSafetyBlock({
      monthLabels,
      byStatus: [
        { status: "open", n: BigInt(2) },
        { status: "investigating", n: 1 },
        { status: "closed", n: 10 },
      ],
      byType: [{ incidentType: "near_miss", n: 4 }],
      byMonth: [
        { yyyymm: "2026-05", n: BigInt(7) },
        { yyyymm: "2026-06", n: 5 },
      ],
      nearMissOpenCount: 11,
      closedRows: [],
    });
    expect(out.openCount).toBe(3);
    expect(out.byStatus).toEqual({ open: 2, investigating: 1, closed: 10 });
    expect(out.byType.near_miss).toBe(4);
    expect(out.nearMissOpenCount).toBe(11);
    expect(out.incidentsCreatedByMonth).toEqual([
      { month: "2026-05", count: 7 },
      { month: "2026-06", count: 5 },
    ]);
    expect(out.meanDaysToCloseSnapshot).toBeNull();
  });

  it("computes mean days to close snapshot from closed rows", () => {
    const t0 = new Date("2026-01-01T00:00:00Z");
    const t1 = new Date("2026-01-11T00:00:00Z");
    const out = computeIncidentSafetyBlock({
      monthLabels: ["2026-01"],
      byStatus: [{ status: "closed", n: 2 }],
      byType: [],
      byMonth: [{ yyyymm: "2026-01", n: 2 }],
      nearMissOpenCount: 0,
      closedRows: [
        { createdAt: t0, updatedAt: t1 },
        { createdAt: t0, updatedAt: new Date("2026-01-06T00:00:00Z") },
      ],
    });
    expect(out.meanDaysToCloseSnapshot).toBe(7.5);
  });

  it("uses precomputed meanDaysToCloseSnapshot when provided, ignoring closed rows", () => {
    const out = computeIncidentSafetyBlock({
      monthLabels: ["2026-01"],
      byStatus: [],
      byType: [],
      byMonth: [],
      nearMissOpenCount: 0,
      meanDaysToCloseSnapshot: 2.2,
      closedRows: [
        { createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-20T00:00:00Z") },
      ],
    });
    expect(out.meanDaysToCloseSnapshot).toBe(2.2);
  });

  it("treats sparse month keys as zero fill", () => {
    const out = computeIncidentSafetyBlock({
      monthLabels: ["2026-05", "2026-06"],
      byStatus: [],
      byType: [],
      byMonth: [{ yyyymm: "2026-06", n: 3 }],
      nearMissOpenCount: 0,
      closedRows: [],
    });
    expect(out.incidentsCreatedByMonth).toEqual([
      { month: "2026-05", count: 0 },
      { month: "2026-06", count: 3 },
    ]);
  });
});

describe("computeCapaSafetyBlock", () => {
  it("derives totals and overdue from grouped status rows", () => {
    const out = computeCapaSafetyBlock({
      byStatus: [
        { status: "planned", n: 2 },
        { status: "completed", n: 3 },
        { status: "verified", n: 1 },
      ],
      overdueCount: 4,
    });
    expect(out.total).toBe(6);
    expect(out.openActiveCount).toBe(5);
    expect(out.overdueCount).toBe(4);
    expect(out.byStatus.verified).toBe(1);
  });
});
