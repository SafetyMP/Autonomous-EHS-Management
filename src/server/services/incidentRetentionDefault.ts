import { and, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { dataRetentionPolicy, retentionDateAnchorEnum } from "@/server/db/schema";

/** UTC-safe “add calendar years” for default retention anchoring (counsel may prescribe a different anchor). */
export function addYearsUtc(from: Date, years: number): Date {
  const d = new Date(from.getTime());
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d;
}

/** Last instant of December 31 for a calendar year (UTC). */
export function endOfCalendarYearUtc(year: number): Date {
  return new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
}

/**
 * `calendar_year_end`: end of the calendar year that is `minimumYears` after the
 * reference date’s UTC calendar year (common “N years after record year” pattern).
 * `rolling_from_event`: occurred_at (or now) + minimumYears in UTC.
 */
export function retainUntilFromPolicyRow(
  referenceDate: Date,
  minimumYears: number,
  anchor: (typeof retentionDateAnchorEnum.enumValues)[number],
): Date {
  if (anchor === "calendar_year_end") {
    const y = referenceDate.getUTCFullYear() + minimumYears;
    return endOfCalendarYearUtc(y);
  }
  return addYearsUtc(referenceDate, minimumYears);
}

/**
 * If the org has `data_retention_policy` rows for `record_class = incident_general`,
 * returns the **latest** `retain_until` implied by any row (longest retention wins).
 * Otherwise returns null.
 */
export async function computeDefaultRetainUntilForNewIncident(
  db: Db,
  organizationId: string,
  referenceDate: Date,
): Promise<Date | null> {
  const rows = await db
    .select({
      years: dataRetentionPolicy.minimumYears,
      anchor: dataRetentionPolicy.retentionDateAnchor,
    })
    .from(dataRetentionPolicy)
    .where(
      and(
        eq(dataRetentionPolicy.organizationId, organizationId),
        eq(dataRetentionPolicy.recordClass, "incident_general"),
      ),
    );

  if (rows.length === 0) {
    return null;
  }

  const candidates = rows.map((r) =>
    retainUntilFromPolicyRow(referenceDate, r.years, r.anchor),
  );
  return new Date(Math.max(...candidates.map((d) => d.getTime())));
}
