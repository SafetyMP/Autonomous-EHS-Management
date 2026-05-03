"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import type { AppRouter } from "@/server/trpc/root";
import {
  dfControlFlexible,
  dfHelperXs,
  dfLabel,
  dfMuted,
  dfPanelHeading,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
  dfTableCaption,
  dfTableHead,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function yearOptions(): number[] {
  const y = new Date().getUTCFullYear();
  return Array.from({ length: 8 }, (_, i) => y - i);
}

type MonthMetricRow = inferRouterOutputs<AppRouter>["compliance"]["establishment"]["listMonthMetrics"][number];
type YearMetricRow = inferRouterOutputs<AppRouter>["compliance"]["establishment"]["listYearMetrics"][number];

function monthDraftsFromRows(rows: MonthMetricRow[] | undefined): Record<number, string> {
  const drafts: Record<number, string> = {};
  const safe = rows ?? [];
  for (let m = 1; m <= 12; m++) {
    const row = safe.find((r) => r.calendarMonth === m);
    drafts[m] = row?.hoursWorked != null ? String(row.hoursWorked) : "";
  }
  return drafts;
}

function MonthlyHoursFields(props: {
  calendarYear: number;
  monthRows: MonthMetricRow[] | undefined;
  upsertMonthPending: boolean;
  onSave: (drafts: Record<number, string>) => Promise<void>;
  onStatus: (tone: "info" | "error", msg: string | null) => void;
}) {
  const [drafts, setDrafts] = useState(() => monthDraftsFromRows(props.monthRows));

  const monthSum = useMemo(() => {
    let s = 0;
    let any = false;
    for (let m = 1; m <= 12; m++) {
      const v = Number(drafts[m]);
      if (drafts[m]?.trim() !== "" && Number.isFinite(v)) {
        s += v;
        any = true;
      }
    }
    return { sum: s, any };
  }, [drafts]);

  const monthRowsExist = (props.monthRows?.length ?? 0) > 0;

  async function handleSave() {
    props.onStatus("info", null);
    try {
      for (let m = 1; m <= 12; m++) {
        const raw = drafts[m]?.trim() ?? "";
        if (raw !== "" && !Number.isFinite(Number(raw))) {
          props.onStatus("error", `Invalid hours for month ${m}.`);
          return;
        }
      }
      await props.onSave(drafts);
      props.onStatus("info", "Monthly hours saved.");
    } catch (e) {
      props.onStatus("error", e instanceof Error ? e.message : "Save failed.");
    }
  }

  return (
    <>
      <p className="mt-2 text-sm text-zinc-800">
        When any monthly rows exist for this establishment and year, TRIR uses the sum of monthly
        hours (missing months count as zero). Otherwise the annual total hours field below is used.
      </p>
      {monthRowsExist && monthSum.any ? (
        <p className="mt-2 text-sm font-semibold text-amber-950" role="status">
          Monthly rows present: draft sum {monthSum.sum.toLocaleString()} hours (save to persist).
          {(props.monthRows?.length ?? 0) < 12 ? (
            <span> Incomplete month grid—TRIR may understate risk vs full-year hours.</span>
          ) : null}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MONTH_LABELS.map((label, idx) => {
          const m = idx + 1;
          return (
            <label key={label} className="block">
              <span className={dfLabel}>{label}</span>
              <input
                type="text"
                inputMode="numeric"
                className={`${dfControlFlexible} mt-1 w-full`}
                value={drafts[m] ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [m]: e.target.value }))}
                aria-label={`Hours worked for ${label} ${props.calendarYear}`}
              />
            </label>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className={dfPrimarySubmit}
          disabled={props.upsertMonthPending}
          onClick={() => void handleSave()}
        >
          {props.upsertMonthPending ? "Saving…" : "Save monthly hours"}
        </button>
      </div>
    </>
  );
}

function AnnualHoursFields(props: {
  upsertYearPending: boolean;
  yearRow: YearMetricRow | undefined;
  onSave: (opts: {
    totalHoursWorked: number | null;
    avgEmployees: number | null;
  }) => Promise<void>;
  onStatus: (tone: "info" | "error", msg: string | null) => void;
}) {
  const [totalHours, setTotalHours] = useState(
    () =>
      props.yearRow?.totalHoursWorked != null ? String(props.yearRow.totalHoursWorked) : "",
  );
  const [avgEmployees, setAvgEmployees] = useState(
    () => (props.yearRow?.avgEmployees != null ? String(props.yearRow.avgEmployees) : ""),
  );

  async function handleSave() {
    props.onStatus("info", null);
    try {
      const th = totalHours.trim() === "" ? null : Math.floor(Number(totalHours));
      const ae = avgEmployees.trim() === "" ? null : Math.floor(Number(avgEmployees));
      if (
        (totalHours.trim() !== "" && !Number.isFinite(Number(totalHours))) ||
        (avgEmployees.trim() !== "" && !Number.isFinite(Number(avgEmployees)))
      ) {
        props.onStatus("error", "Annual metrics must be whole numbers.");
        return;
      }
      await props.onSave({
        totalHoursWorked: th,
        avgEmployees: ae,
      });
      props.onStatus("info", "Annual hours / average employment saved.");
    } catch (e) {
      props.onStatus("error", e instanceof Error ? e.message : "Save failed.");
    }
  }

  return (
    <>
      <h3 className={`mt-8 ${dfSectionHeading}`}>Annual summary (fallback)</h3>
      <p className="mt-2 text-sm text-zinc-800">
        Used when no monthly rows exist for this establishment and year.
      </p>
      <div className="mt-4 flex max-w-xl flex-col gap-4 sm:flex-row">
        <label className="block flex-1">
          <span className={dfLabel}>Total hours worked</span>
          <input
            type="text"
            inputMode="numeric"
            className={`${dfControlFlexible} mt-1 w-full`}
            value={totalHours}
            onChange={(e) => setTotalHours(e.target.value)}
          />
        </label>
        <label className="block flex-1">
          <span className={dfLabel}>Average employment (optional)</span>
          <input
            type="text"
            inputMode="numeric"
            className={`${dfControlFlexible} mt-1 w-full`}
            value={avgEmployees}
            onChange={(e) => setAvgEmployees(e.target.value)}
          />
        </label>
      </div>
      <button
        type="button"
        className={`${dfSecondaryOutline} mt-4`}
        disabled={props.upsertYearPending}
        onClick={() => void handleSave()}
      >
        {props.upsertYearPending ? "Saving…" : "Save annual metrics"}
      </button>
    </>
  );
}

export default function IncidenceRatesPage() {
  const { organizationId } = useOrg();
  const [calendarYear, setCalendarYear] = useState(() => new Date().getUTCFullYear());
  const [establishmentId, setEstablishmentId] = useState<string | "">("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"info" | "error">("info");

  const establishmentsQuery = trpc.compliance.establishment.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const establishments = useMemo(() => establishmentsQuery.data ?? [], [establishmentsQuery.data]);

  const yearMetricsQuery = trpc.compliance.establishment.listYearMetrics.useQuery(
    { organizationId: organizationId!, calendarYear },
    { enabled: !!organizationId },
  );

  const monthMetricsQuery = trpc.compliance.establishment.listMonthMetrics.useQuery(
    {
      organizationId: organizationId!,
      establishmentId: establishmentId || "",
      calendarYear,
    },
    { enabled: !!organizationId && !!establishmentId },
  );

  const snapshotsQuery = trpc.compliance.metrics.listTrirSnapshots.useQuery(
    {
      organizationId: organizationId!,
      calendarYear,
      limit: 25,
    },
    { enabled: !!organizationId },
  );

  const themesQuery = trpc.compliance.metrics.recordableInvestigationThemes.useQuery(
    {
      organizationId: organizationId!,
      calendarYear,
      establishmentId: establishmentId || null,
    },
    { enabled: !!organizationId },
  );

  const utils = trpc.useUtils();

  const yearRow = yearMetricsQuery.data?.find((r) => r.establishmentId === establishmentId);

  function emitStatus(tone: "info" | "error", msg: string | null) {
    setStatusTone(tone);
    setStatusMsg(msg);
  }

  const upsertMonth = trpc.compliance.establishment.upsertMonthMetrics.useMutation({
    onSuccess: async () => {
      await utils.compliance.establishment.listMonthMetrics.invalidate();
    },
  });

  const upsertYear = trpc.compliance.establishment.upsertYearMetrics.useMutation({
    onSuccess: async () => {
      await utils.compliance.establishment.listYearMetrics.invalidate();
    },
  });

  const computeTrir = trpc.compliance.metrics.computeTrirSnapshot.useMutation({
    onSuccess: async (row) => {
      await utils.compliance.metrics.listTrirSnapshots.invalidate();
      const ij = row.inputsJson as Record<string, unknown>;
      const partial = ij.partialMonthlyCoverageWarning === true;
      const src = String(ij.hoursSource ?? "");
      const trir = (row.resultJson as { trir?: number | null }).trir;
      const trirStr = trir == null ? "— (hours missing or zero)" : trir.toFixed(2);
      setStatusTone("info");
      setStatusMsg(
        `Snapshot saved. Recordable incidence rate (TRIR): ${trirStr}. Hours source: ${src}.${partial ? " Warning: partial monthly hours coverage." : ""}`,
      );
    },
    onError: (e) => {
      setStatusTone("error");
      setStatusMsg(e.message);
    },
  });

  function onComputeTrir() {
    if (!organizationId) return;
    setStatusMsg(null);
    computeTrir.mutate({
      organizationId,
      calendarYear,
      establishmentId: establishmentId || null,
    });
  }

  if (!organizationId) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
        <p className="font-medium text-zinc-800">Select an organization</p>
        <OrgSwitcher />
      </div>
    );
  }

  const estLoading = establishmentsQuery.isLoading;
  const themes = themesQuery.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Incidence rates</h1>
          <p className={`mt-1 max-w-3xl ${dfMuted}`}>
            Derived analytics from IMS recordables and establishment hours (OSHA-style TRIR: cases ×
            200,000 ÷ hours). Not an official OSHA filing—confirm submissions with your program owner
            or counsel.
          </p>
          <p className={`mt-2 ${dfHelperXs} text-zinc-800`}>
            Need broader operational KPIs? See{" "}
            <Link href="/dashboard/analytics" className="font-semibold text-emerald-900 underline">
              Safety metrics
            </Link>
            .
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <section
        className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
        aria-label="Filters"
      >
        <h2 className={dfSectionHeading}>Period and establishment</h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
          <label className="block min-w-[12rem]">
            <span className={dfLabel}>Calendar year</span>
            <select
              className={`${dfControlFlexible} mt-1 w-full`}
              value={calendarYear}
              onChange={(e) => setCalendarYear(Number(e.target.value))}
            >
              {yearOptions().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-[16rem] flex-1">
            <span className={dfLabel}>Establishment scope</span>
            <select
              className={`${dfControlFlexible} mt-1 w-full`}
              value={establishmentId}
              onChange={(e) => setEstablishmentId(e.target.value)}
              disabled={estLoading}
            >
              <option value="">Organization total (all establishments)</option>
              {establishments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {establishments.length === 0 && !estLoading ? (
          <p className={`mt-3 ${dfHelperXs} text-zinc-800`} role="status">
            No establishments yet—create one under compliance workflows or seed data before entering
            hours.
          </p>
        ) : null}
      </section>

      <div aria-live="polite" className="min-h-[1.25rem]">
        {statusMsg ? (
          <p
            role={statusTone === "error" ? "alert" : "status"}
            className={
              statusTone === "error"
                ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
                : "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
            }
          >
            {statusMsg}
          </p>
        ) : null}
      </div>

      <section
        className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
        aria-label="Recordable incidence rate"
      >
        <h2 className={dfPanelHeading}>Recordable incidence rate (TRIR)</h2>
        <p className="mt-2 text-sm text-zinc-800">
          Formula: (OSHA recordable count × 200,000) ÷ effective hours worked for the scope and
          calendar year.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className={dfPrimarySubmit}
            disabled={computeTrir.isPending}
            onClick={() => onComputeTrir()}
          >
            {computeTrir.isPending ? "Computing…" : "Compute and save snapshot"}
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <caption className={dfTableCaption}>Recent TRIR snapshots for selected year</caption>
            <thead>
              <tr className={dfTableHead}>
                <th scope="col" className="border border-zinc-200 px-3 py-2">
                  Computed (UTC)
                </th>
                <th scope="col" className="border border-zinc-200 px-3 py-2">
                  TRIR
                </th>
                <th scope="col" className="border border-zinc-200 px-3 py-2">
                  Recordables
                </th>
                <th scope="col" className="border border-zinc-200 px-3 py-2">
                  Hours
                </th>
                <th scope="col" className="border border-zinc-200 px-3 py-2">
                  Hours source
                </th>
              </tr>
            </thead>
            <tbody>
              {(snapshotsQuery.data ?? []).map((row) => {
                const res = row.resultJson as { trir?: number | null };
                const inp = row.inputsJson as Record<string, unknown>;
                return (
                  <tr key={row.id} className="odd:bg-zinc-50/80">
                    <td className="border border-zinc-200 px-3 py-2 tabular-nums text-zinc-800">
                      {new Date(row.createdAt).toISOString().slice(0, 19)}Z
                    </td>
                    <td className="border border-zinc-200 px-3 py-2 tabular-nums font-medium">
                      {res.trir == null ? "—" : res.trir.toFixed(2)}
                    </td>
                    <td className="border border-zinc-200 px-3 py-2 tabular-nums">
                      {String(inp.recordableCount ?? "")}
                    </td>
                    <td className="border border-zinc-200 px-3 py-2 tabular-nums">
                      {String(inp.hoursWorked ?? "")}
                    </td>
                    <td className="border border-zinc-200 px-3 py-2 text-zinc-800">
                      {String(inp.hoursSource ?? "")}
                      {inp.partialMonthlyCoverageWarning === true ? (
                        <span className="ml-1 font-semibold text-amber-900"> (partial months)</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {snapshotsQuery.isLoading ? (
            <p className="mt-2 text-sm text-zinc-700" role="status">
              Loading snapshots…
            </p>
          ) : null}
          {!snapshotsQuery.isLoading && (snapshotsQuery.data?.length ?? 0) === 0 ? (
            <p className="mt-2 text-sm text-zinc-700">No snapshots for this year yet.</p>
          ) : null}
        </div>
      </section>

      <section
        className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
        aria-label="Monthly hours worked"
      >
        <h2 className={dfPanelHeading}>Hours worked (denominator)</h2>
        {!establishmentId ? (
          <p className="mt-2 text-sm text-zinc-800">
            Select an establishment to enter monthly or annual hours. Organization scope still uses
            summed logic across all establishments when you compute TRIR.
          </p>
        ) : (
          <>
            <MonthlyHoursFields
              key={`mh-${establishmentId}-${calendarYear}-${monthMetricsQuery.dataUpdatedAt}`}
              calendarYear={calendarYear}
              monthRows={monthMetricsQuery.data}
              upsertMonthPending={upsertMonth.isPending}
              onStatus={(tone, msg) => {
                emitStatus(tone, msg);
              }}
              onSave={async (drafts) => {
                if (!organizationId || !establishmentId) return;
                for (let m = 1; m <= 12; m++) {
                  const raw = drafts[m]?.trim() ?? "";
                  const hours = raw === "" ? null : Math.max(0, Math.floor(Number(raw)));
                  await upsertMonth.mutateAsync({
                    organizationId,
                    establishmentId,
                    calendarYear,
                    calendarMonth: m,
                    hoursWorked: hours,
                    avgEmployees: null,
                  });
                }
              }}
            />

            <AnnualHoursFields
              key={`ah-${establishmentId}-${calendarYear}-${yearMetricsQuery.dataUpdatedAt}`}
              upsertYearPending={upsertYear.isPending}
              yearRow={yearRow}
              onStatus={(tone, msg) => emitStatus(tone, msg)}
              onSave={async (opts) => {
                if (!organizationId || !establishmentId) return;
                await upsertYear.mutateAsync({
                  organizationId,
                  establishmentId,
                  calendarYear,
                  totalHoursWorked: opts.totalHoursWorked,
                  avgEmployees: opts.avgEmployees,
                });
              }}
            />
          </>
        )}
      </section>

      <section
        className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
        aria-label="Investigation themes among recordables"
      >
        <h2 className={dfPanelHeading}>Investigation themes (IMS-derived)</h2>
        <p className="mt-2 text-sm text-zinc-800">
          Frequency summaries from structured investigation fields on OSHA-recordable incidents—not a
          substitute for formal root cause validation.
        </p>
        {themesQuery.isError ? (
          <p className="mt-2 text-sm text-red-800" role="alert">
            {themesQuery.error.message}
          </p>
        ) : null}
        {themes && themes.qualityFlags.draftDeterminationCount > 0 ? (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
            {themes.qualityFlags.draftDeterminationCount} recordable(s) still in draft OSHA
            determination—numerator may change after review.
          </p>
        ) : null}
        {themes && themes.qualityFlags.missingEstablishmentCount > 0 ? (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
            {themes.qualityFlags.missingEstablishmentCount} recordable(s) lack establishment linkage.
          </p>
        ) : null}

        {themes ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className={dfPanelHeading}>Fishbone categories (incidents with causes)</h3>
              <table className="mt-2 min-w-full border-collapse text-sm">
                <caption className={dfTableCaption}>Fishbone rollup</caption>
                <thead>
                  <tr className={dfTableHead}>
                    <th scope="col" className="border border-zinc-200 px-2 py-2 text-left">
                      Category
                    </th>
                    <th scope="col" className="border border-zinc-200 px-2 py-2 text-right">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {themes.fishboneCategoryCounts.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="border border-zinc-200 px-2 py-2 text-zinc-700">
                        No fishbone data on recordables in this period.
                      </td>
                    </tr>
                  ) : (
                    themes.fishboneCategoryCounts.map((r) => (
                      <tr key={r.categoryId} className="odd:bg-zinc-50/80">
                        <td className="border border-zinc-200 px-2 py-2">{r.label}</td>
                        <td className="border border-zinc-200 px-2 py-2 text-right tabular-nums">
                          {r.count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className={dfPanelHeading}>Causal factor categories</h3>
              <table className="mt-2 min-w-full border-collapse text-sm">
                <caption className={dfTableCaption}>Causal factor rollup</caption>
                <thead>
                  <tr className={dfTableHead}>
                    <th scope="col" className="border border-zinc-200 px-2 py-2 text-left">
                      Category
                    </th>
                    <th scope="col" className="border border-zinc-200 px-2 py-2 text-right">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {themes.causalFactorCategoryCounts.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="border border-zinc-200 px-2 py-2 text-zinc-700">
                        No causal factor rows on recordables in this period.
                      </td>
                    </tr>
                  ) : (
                    themes.causalFactorCategoryCounts.map((r, i) => (
                      <tr key={`${r.category ?? "null"}-${i}`} className="odd:bg-zinc-50/80">
                        <td className="border border-zinc-200 px-2 py-2">
                          {r.category ?? "Uncategorized"}
                        </td>
                        <td className="border border-zinc-200 px-2 py-2 text-right tabular-nums">
                          {r.count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : themesQuery.isLoading ? (
          <p className="mt-4 text-sm text-zinc-700" role="status">
            Loading themes…
          </p>
        ) : null}

        {themes && themes.contributingFactorCounts.length > 0 ? (
          <div className="mt-6">
            <h3 className={dfPanelHeading}>Contributing factors (top)</h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-800">
              {themes.contributingFactorCounts.map((r) => (
                <li key={r.factor}>
                  <span className="font-medium tabular-nums">{r.count}×</span> {r.factor}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {themes && themes.incidents.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <h3 className={dfPanelHeading}>Recordable incidents</h3>
            <table className="mt-2 min-w-full border-collapse text-sm">
              <caption className={dfTableCaption}>Incidents in scope</caption>
              <thead>
                <tr className={dfTableHead}>
                  <th scope="col" className="border border-zinc-200 px-2 py-2 text-left">
                    Title
                  </th>
                  <th scope="col" className="border border-zinc-200 px-2 py-2 text-left">
                    Type
                  </th>
                  <th scope="col" className="border border-zinc-200 px-2 py-2 text-left">
                    Occurred
                  </th>
                  <th scope="col" className="border border-zinc-200 px-2 py-2 text-left">
                    Root cause summary
                  </th>
                </tr>
              </thead>
              <tbody>
                {themes.incidents.map((inc) => (
                  <tr key={inc.id} className="odd:bg-zinc-50/80">
                    <td className="border border-zinc-200 px-2 py-2">
                      <Link
                        href={`/dashboard/incidents/${inc.id}`}
                        className="font-semibold text-emerald-900 underline"
                      >
                        {inc.title}
                      </Link>
                    </td>
                    <td className="border border-zinc-200 px-2 py-2">{inc.incidentType}</td>
                    <td className="border border-zinc-200 px-2 py-2 tabular-nums">
                      {inc.occurredAt
                        ? new Date(inc.occurredAt).toISOString().slice(0, 10)
                        : "—"}
                    </td>
                    <td className="border border-zinc-200 px-2 py-2 text-zinc-800">
                      {inc.rootCauseSummary ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
