import { createHash } from "node:crypto";
import { and, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import {
  complianceMetricSnapshot,
  establishment,
  establishmentMonthMetrics,
  establishmentYearMetrics,
  incident,
  workRelatedInjuryIllnessRecord,
} from "@/server/db/schema";

/** OSHA incidence rate convention: (N × 200,000) / total hours worked (Form 300A-style). */
export const OSHA_INCIDENCE_RATE_HOURS_BASE = 200_000 as const;
export const TRIR_FORMULA_VERSION = 1 as const;

export type TrirHoursSource = "monthly_roll_up" | "annual_year_metrics" | "mixed";

export type TrirComputationInputs = {
  calendarYear: number;
  organizationId: string;
  establishmentId: string | null;
  recordableCount: number;
  hoursWorked: number;
  citation: string;
  hoursSource: TrirHoursSource;
  partialMonthlyCoverageWarning: boolean;
  monthMetricsRowCount: number;
};

export function computeTrirRate(recordableCount: number, hoursWorked: number): number | null {
  if (!Number.isFinite(hoursWorked) || hoursWorked <= 0) return null;
  if (!Number.isFinite(recordableCount) || recordableCount < 0) return null;
  return (recordableCount * OSHA_INCIDENCE_RATE_HOURS_BASE) / hoursWorked;
}

export async function computeEffectiveHoursWorked(
  db: Db,
  establishmentIds: string[],
  calendarYear: number,
): Promise<{
  hoursWorked: number;
  hoursSource: TrirHoursSource;
  partialMonthlyCoverageWarning: boolean;
  monthMetricsRowCount: number;
}> {
  if (establishmentIds.length === 0) {
    return {
      hoursWorked: 0,
      hoursSource: "annual_year_metrics",
      partialMonthlyCoverageWarning: false,
      monthMetricsRowCount: 0,
    };
  }

  const monthRows = await db
    .select()
    .from(establishmentMonthMetrics)
    .where(
      and(
        inArray(establishmentMonthMetrics.establishmentId, establishmentIds),
        eq(establishmentMonthMetrics.calendarYear, calendarYear),
      ),
    );

  const monthByEst = new Map<string, (typeof monthRows)[number][]>();
  for (const row of monthRows) {
    const list = monthByEst.get(row.establishmentId) ?? [];
    list.push(row);
    monthByEst.set(row.establishmentId, list);
  }

  const yearRows = await db
    .select()
    .from(establishmentYearMetrics)
    .where(
      and(
        inArray(establishmentYearMetrics.establishmentId, establishmentIds),
        eq(establishmentYearMetrics.calendarYear, calendarYear),
      ),
    );
  const yearByEst = new Map(yearRows.map((r) => [r.establishmentId, r]));

  let total = 0;
  let usedMonthly = false;
  let usedAnnual = false;
  let partialMonthlyCoverageWarning = false;

  for (const estId of establishmentIds) {
    const months = monthByEst.get(estId) ?? [];
    if (months.length > 0) {
      usedMonthly = true;
      total += months.reduce((s, m) => s + (m.hoursWorked ?? 0), 0);
      const distinctMonths = new Set(months.map((m) => m.calendarMonth)).size;
      const monthsWithHours = months.filter((m) => m.hoursWorked != null).length;
      if (distinctMonths < 12 || monthsWithHours < 12) {
        partialMonthlyCoverageWarning = true;
      }
    } else {
      usedAnnual = true;
      const yr = yearByEst.get(estId);
      total += yr?.totalHoursWorked ?? 0;
    }
  }

  const hoursSource: TrirHoursSource =
    usedMonthly && usedAnnual ? "mixed" : usedMonthly ? "monthly_roll_up" : "annual_year_metrics";

  return {
    hoursWorked: total,
    hoursSource,
    partialMonthlyCoverageWarning,
    monthMetricsRowCount: monthRows.length,
  };
}

export function hashTrirInputs(inputs: TrirComputationInputs): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        calendarYear: inputs.calendarYear,
        organizationId: inputs.organizationId,
        establishmentId: inputs.establishmentId,
        recordableCount: inputs.recordableCount,
        hoursWorked: inputs.hoursWorked,
        formulaVersion: TRIR_FORMULA_VERSION,
        hoursSource: inputs.hoursSource,
        partialMonthlyCoverageWarning: inputs.partialMonthlyCoverageWarning,
        monthMetricsRowCount: inputs.monthMetricsRowCount,
      }),
    )
    .digest("hex")
    .slice(0, 64);
}

export async function computeOrgTrirInputs(
  db: Db,
  args: { organizationId: string; calendarYear: number; establishmentId?: string | null },
): Promise<TrirComputationInputs> {
  const start = new Date(Date.UTC(args.calendarYear, 0, 1));
  const end = new Date(Date.UTC(args.calendarYear, 11, 31, 23, 59, 59, 999));

  const orgEstablishmentIds = (
    await db
      .select({ id: establishment.id })
      .from(establishment)
      .where(eq(establishment.organizationId, args.organizationId))
  ).map((r) => r.id);

  const hoursEstablishmentIds =
    args.establishmentId !== undefined && args.establishmentId !== null
      ? orgEstablishmentIds.includes(args.establishmentId)
        ? [args.establishmentId]
        : []
      : orgEstablishmentIds;

  const countConditions = [
    eq(workRelatedInjuryIllnessRecord.organizationId, args.organizationId),
    eq(workRelatedInjuryIllnessRecord.oshaRecordable, true),
    gte(incident.occurredAt, start),
    lte(incident.occurredAt, end),
  ];

  if (args.establishmentId !== undefined && args.establishmentId !== null) {
    countConditions.push(eq(workRelatedInjuryIllnessRecord.establishmentId, args.establishmentId));
  } else if (orgEstablishmentIds.length > 0) {
    /* Org-wide: include recordables still missing establishment (common right after intake). */
    countConditions.push(
      or(
        isNull(workRelatedInjuryIllnessRecord.establishmentId),
        inArray(workRelatedInjuryIllnessRecord.establishmentId, orgEstablishmentIds),
      )!,
    );
  }

  const [countRow] = await db
    .select({ c: sql<number>`cast(count(*) as int)` })
    .from(workRelatedInjuryIllnessRecord)
    .innerJoin(incident, eq(incident.id, workRelatedInjuryIllnessRecord.incidentId))
    .where(and(...countConditions));

  const recordableCount = countRow?.c ?? 0;

  let hoursWorked = 0;
  let hoursSource: TrirHoursSource = "annual_year_metrics";
  let partialMonthlyCoverageWarning = false;
  let monthMetricsRowCount = 0;

  if (hoursEstablishmentIds.length > 0) {
    const roll = await computeEffectiveHoursWorked(db, hoursEstablishmentIds, args.calendarYear);
    hoursWorked = roll.hoursWorked;
    hoursSource = roll.hoursSource;
    partialMonthlyCoverageWarning = roll.partialMonthlyCoverageWarning;
    monthMetricsRowCount = roll.monthMetricsRowCount;
  }

  return {
    calendarYear: args.calendarYear,
    organizationId: args.organizationId,
    establishmentId: args.establishmentId ?? null,
    recordableCount,
    hoursWorked,
    hoursSource,
    partialMonthlyCoverageWarning,
    monthMetricsRowCount,
    citation: "OSHA Form 300A incidence rate: (N × 200,000) ÷ total hours worked (29 CFR 1904).",
  };
}

export async function persistTrirSnapshot(
  db: Db,
  inputs: TrirComputationInputs,
  computedByUserId: string,
): Promise<typeof complianceMetricSnapshot.$inferSelect> {
  const trir = computeTrirRate(inputs.recordableCount, inputs.hoursWorked);
  const inputsHash = hashTrirInputs(inputs);
  const inputsJson: Record<string, unknown> = { ...inputs, formulaVersion: TRIR_FORMULA_VERSION };
  const resultJson: Record<string, unknown> = {
    trir,
    hoursBase: OSHA_INCIDENCE_RATE_HOURS_BASE,
    formulaVersion: TRIR_FORMULA_VERSION,
    partialMonthlyCoverageWarning: inputs.partialMonthlyCoverageWarning,
    hoursSource: inputs.hoursSource,
  };

  const [row] = await db
    .insert(complianceMetricSnapshot)
    .values({
      organizationId: inputs.organizationId,
      establishmentId: inputs.establishmentId,
      metricKey: "trir",
      calendarYear: inputs.calendarYear,
      formulaVersion: TRIR_FORMULA_VERSION,
      inputsHash,
      inputsJson,
      resultJson,
      computedByUserId,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to insert compliance_metric_snapshot.");
  }
  return row;
}
