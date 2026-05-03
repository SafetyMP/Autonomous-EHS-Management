/**
 * Pure KPI assembly for `analytics.safetyDashboard` query results — unit-testable without DB.
 */

export type IncidentSafetyBlock = {
  openCount: number;
  byStatus: { open: number; investigating: number; closed: number };
  byType: Record<string, number>;
  nearMissOpenCount: number;
  incidentsCreatedByMonth: { month: string; count: number }[];
  meanDaysToCloseSnapshot: number | null;
};

export type CapaSafetyBlock = {
  total: number;
  openActiveCount: number;
  overdueCount: number;
  byStatus: {
    pending_approval: number;
    planned: number;
    in_progress: number;
    completed: number;
    verified: number;
  };
};

export function utcStartOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDaysUtc(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

export function trailingMonthKeys(trailing: number, anchor: Date): string[] {
  const out: string[] = [];
  for (let i = trailing - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1));
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    out.push(`${y}-${m}`);
  }
  return out;
}

/** Bigint-safe count normalization from Drizzle `count()` rows. */
function toNum(n: unknown): number {
  if (typeof n === "bigint") return Number(n);
  if (typeof n === "number") return n;
  if (typeof n === "string") return Number.parseInt(n, 10);
  return Number(n);
}

export function computeIncidentSafetyBlock(input: {
  monthLabels: string[];
  byStatus: readonly { status: string; n: unknown }[];
  byType: readonly { incidentType: string; n: unknown }[];
  byMonth: readonly { yyyymm: string; n: unknown }[];
  nearMissOpenCount: number;
  /** When set (including `null` from an empty closed set), skips row-based mean; prefer DB aggregate from the router. */
  meanDaysToCloseSnapshot?: number | null;
  closedRows?: readonly { createdAt: Date; updatedAt: Date }[];
}): IncidentSafetyBlock {
  const monthMap = Object.fromEntries(
    input.byMonth.map((r) => [r.yyyymm, toNum(r.n)]),
  );
  const incidentsCreatedByMonth = input.monthLabels.map((k) => ({
    month: k,
    count: monthMap[k] ?? 0,
  }));

  const statusMap = Object.fromEntries(input.byStatus.map((r) => [r.status, toNum(r.n)]));
  const typeMap = Object.fromEntries(input.byType.map((r) => [r.incidentType, toNum(r.n)]));

  const openNonClosed = (statusMap.open ?? 0) + (statusMap.investigating ?? 0);

  const closedRows = input.closedRows ?? [];
  let meanDaysToCloseSnapshot: number | null = null;
  if ("meanDaysToCloseSnapshot" in input) {
    meanDaysToCloseSnapshot = input.meanDaysToCloseSnapshot ?? null;
  } else if (closedRows.length > 0) {
    const days = closedRows.map((r) => {
      const a = r.createdAt.getTime();
      const b = r.updatedAt.getTime();
      return Math.max(0, (b - a) / 86_400_000);
    });
    const mean = days.reduce((s, x) => s + x, 0) / days.length;
    meanDaysToCloseSnapshot = Math.round(mean * 10) / 10;
  }

  return {
    openCount: openNonClosed,
    byStatus: {
      open: statusMap.open ?? 0,
      investigating: statusMap.investigating ?? 0,
      closed: statusMap.closed ?? 0,
    },
    byType: typeMap,
    nearMissOpenCount: input.nearMissOpenCount,
    incidentsCreatedByMonth,
    meanDaysToCloseSnapshot,
  };
}

export function computeCapaSafetyBlock(input: {
  byStatus: readonly { status: string; n: unknown }[];
  overdueCount: number;
}): CapaSafetyBlock {
  const statusMap = Object.fromEntries(input.byStatus.map((r) => [r.status, toNum(r.n)]));

  const openForWork =
    (statusMap.pending_approval ?? 0) +
    (statusMap.planned ?? 0) +
    (statusMap.in_progress ?? 0) +
    (statusMap.completed ?? 0);

  const total = Object.values(statusMap).reduce((a, b) => a + b, 0);

  return {
    total,
    openActiveCount: openForWork,
    overdueCount: input.overdueCount,
    byStatus: {
      pending_approval: statusMap.pending_approval ?? 0,
      planned: statusMap.planned ?? 0,
      in_progress: statusMap.in_progress ?? 0,
      completed: statusMap.completed ?? 0,
      verified: statusMap.verified ?? 0,
    },
  };
}
