"use client";

import Link from "next/link";
import { useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import type { AppRouter } from "@/server/trpc/root";
import {
  dfControlFlexible,
  dfHelperXs,
  dfPanelHeading,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { leadingIndicatorsToCsv } from "@/lib/analytics/leadingIndicatorsCsv";
import { observationFollowUpSlaToCsv } from "@/lib/analytics/observationFollowUpSlaCsv";
import { trpc } from "@/trpc/react";

type SafetyDashboard = inferRouterOutputs<AppRouter>["analytics"]["safetyDashboard"];

function csvEscape(cell: string): string {
  if (/[",\n\r]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

function safetyDashboardToCsv(data: SafetyDashboard): string {
  const lines: string[][] = [["section", "key", "value"]];
  lines.push(["meta", "glossaryVersion", String(data.glossaryVersion)]);
  lines.push(["meta", "generatedAt", data.generatedAt]);
  if (data.incidents) {
    lines.push(["incidents", "openCount", String(data.incidents.openCount)]);
    lines.push(["incidents", "nearMissOpenCount", String(data.incidents.nearMissOpenCount)]);
    lines.push([
      "incidents",
      "meanDaysToCloseSnapshot",
      data.incidents.meanDaysToCloseSnapshot != null
        ? String(data.incidents.meanDaysToCloseSnapshot)
        : "",
    ]);
    lines.push(["incidents", "status.open", String(data.incidents.byStatus.open)]);
    lines.push([
      "incidents",
      "status.investigating",
      String(data.incidents.byStatus.investigating),
    ]);
    lines.push(["incidents", "status.closed", String(data.incidents.byStatus.closed)]);
    for (const [k, v] of Object.entries(data.incidents.byType)) {
      lines.push(["incidents", `type.${k}`, String(v)]);
    }
    for (const row of data.incidents.incidentsCreatedByMonth) {
      lines.push(["incidents", `month.${row.month}`, String(row.count)]);
    }
  }
  if (data.capas) {
    lines.push(["capas", "total", String(data.capas.total)]);
    lines.push(["capas", "openActiveCount", String(data.capas.openActiveCount)]);
    lines.push(["capas", "overdueCount", String(data.capas.overdueCount)]);
    for (const [k, v] of Object.entries(data.capas.byStatus)) {
      lines.push(["capas", `status.${k}`, String(v)]);
    }
  }
  if (data.training) {
    lines.push([
      "training",
      "recordsWithExpiry",
      String(data.training.recordsWithExpiry),
    ]);
    lines.push([
      "training",
      "expiringWithin30DaysCount",
      String(data.training.expiringWithin30DaysCount),
    ]);
  }
  if (data.auditFindings) {
    lines.push([
      "auditFindings",
      "openNonConformanceCount",
      String(data.auditFindings.openNonConformanceCount),
    ]);
  }
  if (data.environment) {
    if (data.environment.aspectCount != null) {
      lines.push(["environment", "aspectCount", String(data.environment.aspectCount)]);
    }
    if (data.environment.obligationCount != null) {
      lines.push([
        "environment",
        "obligationCount",
        String(data.environment.obligationCount),
      ]);
    }
    if (data.environment.obligationsReviewOverdue != null) {
      lines.push([
        "environment",
        "obligationsReviewOverdue",
        String(data.environment.obligationsReviewOverdue),
      ]);
    }
  }
  if (data.fieldOperations) {
    lines.push([
      "fieldOperations",
      "activePermitsCount",
      String(data.fieldOperations.activePermitsCount),
    ]);
    lines.push([
      "fieldOperations",
      "pendingPermitApprovalCount",
      String(data.fieldOperations.pendingPermitApprovalCount),
    ]);
    lines.push([
      "fieldOperations",
      "nonClosedObservationCount",
      String(data.fieldOperations.nonClosedObservationCount),
    ]);
    lines.push([
      "fieldOperations",
      "observationsLast30Days",
      String(data.fieldOperations.observationsLast30Days),
    ]);
    lines.push([
      "fieldOperations",
      "observationFollowUpOverdueCount",
      String(data.fieldOperations.observationFollowUpOverdueCount),
    ]);
    lines.push([
      "fieldOperations",
      "activePermitsExpiringWithin7DaysCount",
      String(data.fieldOperations.activePermitsExpiringWithin7DaysCount),
    ]);
    lines.push([
      "fieldOperations",
      "atRiskObservationCountLast90Days",
      String(data.fieldOperations.atRiskObservationCountLast90Days),
    ]);
  }
  return lines.map((r) => r.map(csvEscape).join(",")).join("\r\n");
}

function BarChart({
  title,
  rows,
  valueLabel = "Count",
}: {
  title: string;
  rows: { label: string; value: number }[];
  valueLabel?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className={dfPanelHeading}>{title}</h2>
      <p className={`mt-1 ${dfHelperXs}`}>{valueLabel}</p>
      <div className="mt-4 flex h-36 items-end gap-1 sm:gap-2" role="img" aria-label={title}>
        {rows.map((r, idx) => (
          <div key={`${idx}-${r.label}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-medium tabular-nums text-zinc-800 sm:text-xs">
              {r.value}
            </span>
            <div
              className="w-full max-w-[2.5rem] rounded-t bg-emerald-700/90 sm:max-w-none"
              style={{ height: `${Math.max(6, (r.value / max) * 100)}%` }}
              title={`${r.label}: ${r.value}`}
            />
            <span className="max-w-full truncate text-[10px] text-zinc-600 sm:text-xs" title={r.label}>
              {r.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBars({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className={dfPanelHeading}>{title}</h2>
      <ul className="mt-3 space-y-2 text-base">
        {rows.map((r, idx) => (
          <li key={`${idx}-${r.label}`} className="flex flex-col gap-1">
            <div className={`flex justify-between gap-2 ${dfHelperXs}`}>
              <span className="font-medium capitalize">{r.label.replace(/_/g, " ")}</span>
              <span className="tabular-nums">{r.value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-zinc-100">
              <div
                className="h-full rounded bg-emerald-700/85"
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AnalyticsPage() {
  const { organizationId } = useOrg();
  const [months, setMonths] = useState(12);

  const { data, isLoading, isError, error } = trpc.analytics.safetyDashboard.useQuery(
    { organizationId: organizationId!, trailingMonths: months },
    { enabled: !!organizationId },
  );

  const {
    data: leading,
    isLoading: leadingLoading,
    isError: leadingErrFlag,
    error: leadingErr,
  } = trpc.analytics.leadingIndicators.useQuery(
    { organizationId: organizationId!, trailingDays: 90 },
    { enabled: !!organizationId },
  );

  const {
    data: opsAuto,
    isLoading: opsAutoLoading,
    isError: opsAutoErr,
    error: opsAutoError,
  } = trpc.analytics.operationsAutonomy.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const {
    data: obsSla,
    isLoading: obsSlaLoading,
    isError: obsSlaErr,
    error: obsSlaError,
  } = trpc.analytics.observationFollowUpSla.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const capaFunnelRows = data?.capas
    ? (
        [
          "pending_approval",
          "planned",
          "in_progress",
          "completed",
          "verified",
        ] as const
      ).map((k) => ({ label: k, value: data.capas!.byStatus[k] }))
    : [];

  const incidentTypeRows = data?.incidents
    ? Object.entries(data.incidents.byType).map(([label, value]) => ({ label, value }))
    : [];

  const monthSeries = data?.incidents?.incidentsCreatedByMonth ?? [];

  function downloadCsv() {
    if (!data) return;
    const blob = new Blob([safetyDashboardToCsv(data)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ehs-metrics-${organizationId ?? "org"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadLeadingCsv() {
    if (!leading || !organizationId) return;
    const blob = new Blob(
      [
        leadingIndicatorsToCsv({
          generatedAt: leading.generatedAt,
          trailingDays: leading.trailingDays,
          overdueObservationFollowUps: leading.overdueObservationFollowUps,
          observationsLinkedToCapaInWindow: leading.observationsLinkedToCapaInWindow,
          repeatObservationClusters: leading.repeatObservationClusters,
          observationsLinkedToVerifiedCapaInWindow: leading.observationsLinkedToVerifiedCapaInWindow,
        }),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ehs-leading-indicators-${organizationId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadObservationSlaCsv() {
    if (!obsSla || !organizationId) return;
    const blob = new Blob(
      [
        observationFollowUpSlaToCsv({
          generatedAt: obsSla.generatedAt,
          overdueFollowUpCount: obsSla.overdueFollowUpCount,
          followUpDueWithin7DaysCount: obsSla.followUpDueWithin7DaysCount,
          openObservationWithFollowUpCount: obsSla.openObservationWithFollowUpCount,
          observationEscalationsLast90Days: obsSla.observationEscalationsLast90Days,
          overdueSamples: obsSla.overdueSamples.map((row) => ({
            id: row.id,
            summary: row.summary,
            status: row.status,
            followUpDueAt: row.followUpDueAt,
            assigneeUserId: row.assigneeUserId,
          })),
        }),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ehs-observation-follow-up-sla-${organizationId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!organizationId) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
        <p className="font-medium text-zinc-800">Select an organization</p>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Safety metrics</h1>
          <p className="text-base text-zinc-700">
            Leading and lagging indicators scoped to your permissions.
          </p>
          <p className={`mt-2 ${dfHelperXs} text-zinc-800`}>
            OSHA-style incidence rates (TRIR) and establishment hours:{" "}
            <Link href="/dashboard/analytics/incidence-rates" className="font-semibold text-emerald-900 underline">
              Incidence rates
            </Link>
            .
          </p>
          {data?.generatedAt ? (
            <p className={`mt-1 ${dfHelperXs}`}>Snapshot: {new Date(data.generatedAt).toLocaleString()}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <span className="whitespace-nowrap">Trailing months</span>
            <select
              className={`${dfControlFlexible} min-w-[5.5rem] sm:text-sm`}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
            >
              {[3, 6, 12, 18, 24].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`${dfSecondaryOutline} disabled:opacity-50 sm:text-base`}
            disabled={!data}
            onClick={() => downloadCsv()}
          >
            Download CSV
          </button>
          <OrgSwitcher />
        </div>
      </div>

      {isLoading ? (
        <p className="text-base text-zinc-600" role="status">
          Loading metrics…
        </p>
      ) : null}
      {isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-900" role="alert">
          {error.message}
        </p>
      ) : null}

      <section
        className="rounded-lg border border-zinc-200 bg-slate-50/80 p-4 shadow-sm"
        aria-label="Operations automation and SLAs"
        id="operations-sla-escalations"
      >
        <h2 className={dfPanelHeading}>Operations automation and SLAs</h2>
        <p className={`mt-2 text-sm ${dfHelperXs} text-zinc-800`}>
          {opsAuto?.disclaimer ??
            "Escalations are recorded when scheduled jobs detect breached follow-up or approval deadlines—supervisors and approvers own the next action."}
        </p>
        {opsAutoLoading ? (
          <p className="mt-2 text-base text-zinc-600" role="status">
            Loading automation snapshot…
          </p>
        ) : null}
        {opsAutoErr ? (
          <p className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-900" role="alert">
            {opsAutoError?.message}
          </p>
        ) : null}
        {opsAuto ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {opsAuto.programAutomation.observationFollowUpEscalationsRecorded90d != null ? (
              <MetricTile
                title="Observation SLA escalations (90d)"
                value={opsAuto.programAutomation.observationFollowUpEscalationsRecorded90d}
                href="/dashboard/observations"
                emphasize={opsAuto.programAutomation.observationFollowUpEscalationsRecorded90d > 0}
              />
            ) : null}
            {opsAuto.programAutomation.approvalSlaEscalationsRecorded90d != null ? (
              <MetricTile
                title="Approval SLA escalations (90d)"
                value={opsAuto.programAutomation.approvalSlaEscalationsRecorded90d}
                href="/dashboard/approvals"
                emphasize={opsAuto.programAutomation.approvalSlaEscalationsRecorded90d > 0}
              />
            ) : null}
          </div>
        ) : null}
        {opsAuto?.cronHealth && opsAuto.cronHealth.jobs.length > 0 ? (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-3">
            <h3 className="text-sm font-semibold text-zinc-900">Scheduled job health (org admin)</h3>
            <ul className="mt-2 divide-y divide-zinc-100 text-sm text-zinc-800">
              {opsAuto.cronHealth.jobs.map((j, idx) => (
                <li key={`${idx}-${j.jobKey}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="font-mono text-xs">{j.jobKey}</span>
                  <span>
                    {j.lastOk ? (
                      <span className="text-emerald-800">OK</span>
                    ) : (
                      <span className="text-red-800">Failed</span>
                    )}
                    <span className="ml-2 tabular-nums text-zinc-600">
                      {new Date(j.lastStartedAt).toLocaleString()} · {j.lastDurationMs} ms
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className={`mt-2 ${dfHelperXs}`}>
              Runbook: <code className="rounded bg-zinc-100 px-1">docs/runbooks/cron-metrics-observability.md</code>
              {" · "}
              <code className="rounded bg-zinc-100 px-1">docs/integration-connector-mapping.md</code>
            </p>
          </div>
        ) : null}
      </section>

      <section
        className="rounded-lg border border-violet-200 bg-violet-50/70 p-4 shadow-sm"
        aria-label="Observation follow-up SLA ladder"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className={`${dfPanelHeading} text-zinc-900`}>Observation follow-up SLA ladder</h2>
          <button
            type="button"
            className={`${dfSecondaryOutline} disabled:opacity-50 sm:text-base`}
            disabled={!obsSla}
            onClick={() => downloadObservationSlaCsv()}
          >
            Download SLA CSV (overdue samples)
          </button>
        </div>
        <p className={`mt-2 text-sm ${dfHelperXs} text-zinc-800`}>
          Rollups distinguish overdue queues, follow-ups becoming due soon, recorded escalations, and sample IDs for routing to the observation inbox.
        </p>
        {obsSlaLoading ? (
          <p className="mt-2 text-base text-zinc-600" role="status">
            Loading SLA snapshot…
          </p>
        ) : null}
        {obsSlaErr ? (
          <p className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-900" role="alert">
            {obsSlaError?.message}
          </p>
        ) : null}
        {obsSla ? (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricTile
                title="Overdue follow-ups"
                value={obsSla.overdueFollowUpCount}
                href="/dashboard/observations"
                emphasize={obsSla.overdueFollowUpCount > 0}
              />
              <MetricTile
                title="Due in next 7 days"
                value={obsSla.followUpDueWithin7DaysCount}
                href="/dashboard/observations"
              />
              <MetricTile
                title="Tracked open follow-ups"
                value={obsSla.openObservationWithFollowUpCount}
                href="/dashboard/observations"
              />
              <MetricTile
                title="Escalations logged (90d)"
                value={obsSla.observationEscalationsLast90Days}
                href="/dashboard/observations"
                emphasize={obsSla.observationEscalationsLast90Days > 0}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                  <h3 className="text-sm font-semibold text-zinc-900">Overdue sample (FIFO)</h3>
                  <ul className={`mt-2 divide-y divide-zinc-100 ${dfHelperXs}`}>
                    {obsSla.overdueSamples.map((row) => (
                      <li key={row.id} className="py-1.5">
                        <Link
                          className="font-medium text-violet-800 underline underline-offset-2 hover:text-violet-950"
                          href={`/dashboard/observations/${row.id}`}
                        >
                          {row.summary.slice(0, 80)}
                          {row.summary.length > 80 ? "…" : ""}
                        </Link>
                        <span className="ml-2 text-zinc-600">
                          {row.followUpDueAt instanceof Date
                            ? row.followUpDueAt.toISOString()
                            : row.followUpDueAt
                              ? String(row.followUpDueAt)
                              : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {obsSla.overdueSamples.length === 0 ? (
                    <p className="mt-1 text-xs text-zinc-600">No overdue follow-ups tracked.</p>
                  ) : null}
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-3">
                  <h3 className="text-sm font-semibold text-zinc-900">Due soon sample (≤7d)</h3>
                  <ul className={`mt-2 divide-y divide-zinc-100 ${dfHelperXs}`}>
                    {obsSla.dueSoonSamples.map((row) => (
                      <li key={row.id} className="py-1.5">
                        <Link
                          className="font-medium text-violet-800 underline underline-offset-2 hover:text-violet-950"
                          href={`/dashboard/observations/${row.id}`}
                        >
                          {row.summary.slice(0, 80)}
                          {row.summary.length > 80 ? "…" : ""}
                        </Link>
                        <span className="ml-2 text-zinc-600">
                          {row.followUpDueAt instanceof Date
                            ? row.followUpDueAt.toISOString()
                            : row.followUpDueAt
                              ? String(row.followUpDueAt)
                              : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {obsSla.dueSoonSamples.length === 0 ? (
                    <p className="mt-1 text-xs text-zinc-600">Queue is quiet for this window.</p>
                  ) : null}
                </div>
              </div>
            {obsSla.latestEscalations.length > 0 ? (
              <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3">
                <h3 className="text-sm font-semibold text-zinc-900">Latest recorded escalations</h3>
                <ul className={`mt-2 divide-y divide-zinc-100 text-sm ${dfHelperXs}`}>
                  {obsSla.latestEscalations.map((ev) => (
                    <li key={ev.id} className="flex flex-wrap gap-2 py-1.5 text-zinc-800">
                      <span className="font-mono text-xs">{ev.id.slice(0, 8)}…</span>
                      <Link className="text-violet-800 underline underline-offset-2" href={`/dashboard/observations/${ev.entityId}`}>
                        Observation {ev.entityId.slice(0, 8)}…
                      </Link>
                      <span className="text-zinc-600">{ev.message ?? ""}</span>
                      <span className="tabular-nums text-xs text-zinc-500">
                        {ev.detectedAt instanceof Date ? ev.detectedAt.toISOString() : String(ev.detectedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : !obsSlaLoading && !obsSlaErr ? (
          <p className="mt-2 text-sm text-zinc-600">
            SLA ladder requires observation read permission for this organization.
          </p>
        ) : null}
      </section>

      <section
        className="rounded-lg border border-zinc-200 bg-amber-50/60 p-4 shadow-sm"
        aria-label="Leading indicators"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className={`${dfPanelHeading} text-zinc-900`}>Observation leading indicators</h2>
          <button
            type="button"
            className={`${dfSecondaryOutline} disabled:opacity-50 sm:text-base`}
            disabled={!leading}
            onClick={() => downloadLeadingCsv()}
          >
            Download leading CSV
          </button>
        </div>
        <p className={`mt-2 text-sm ${dfHelperXs} text-zinc-800`}>
          {leading?.disclaimer ??
            "Supervisory indicators for repeat hazards and follow-up load—not regulatory injury/illness filings."}
        </p>
        {leadingLoading ? (
          <p className="mt-2 text-base text-zinc-600" role="status">
            Loading leading indicators…
          </p>
        ) : null}
        {leadingErrFlag ? (
          <p className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-900" role="alert">
            {leadingErr?.message}
          </p>
        ) : null}
        {leading ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {leading.overdueObservationFollowUps != null ? (
              <MetricTile
                title="Overdue observation follow-ups"
                value={leading.overdueObservationFollowUps}
                href="/dashboard/observations"
                emphasize={leading.overdueObservationFollowUps > 0}
              />
            ) : null}
            {leading.observationsLinkedToCapaInWindow != null ? (
              <MetricTile
                title="Observations linked to CAPA (window)"
                value={leading.observationsLinkedToCapaInWindow}
                href="/dashboard/observations"
              />
            ) : null}
            {leading.observationsLinkedToVerifiedCapaInWindow != null ? (
              <MetricTile
                title="Linked to verified CAPA (window)"
                value={leading.observationsLinkedToVerifiedCapaInWindow}
                href="/dashboard/capa"
              />
            ) : null}
            <MetricTile
              title="Trailing window (days)"
              value={leading.trailingDays}
              href="/dashboard/analytics"
              muted
            />
          </div>
        ) : !leadingLoading && !leadingErrFlag ? (
          <p className="mt-2 text-sm text-zinc-600">No access to observation or CAPA reads for this org.</p>
        ) : null}
        {leading?.repeatObservationClusters && leading.repeatObservationClusters.length > 0 ? (
          <div className="mt-4 rounded border border-zinc-200 bg-white p-3">
            <h3 className="text-sm font-semibold text-zinc-900">Repeat clusters (site + category, 2+ in window)</h3>
            <ul className="mt-2 divide-y divide-zinc-100 text-sm text-zinc-800">
              {leading.repeatObservationClusters.map((r, idx) => (
                <li
                  key={`${idx}-${r.siteId ?? "none"}-${String(r.category)}`}
                  className="flex justify-between gap-2 py-1.5"
                >
                  <span className="capitalize">
                    {(r.siteId ? `Site ${r.siteId.slice(0, 8)}…` : "All sites") +
                      " · " +
                      String(r.category).replaceAll("_", " ")}
                  </span>
                  <span className="tabular-nums font-medium">{r.observationCount}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data?.incidents ? (
          <MetricTile
            title="Open incidents"
            value={data.incidents.openCount}
            href="/dashboard/incidents"
          />
        ) : (
          <MetricTile title="Open incidents" value="—" href="/dashboard/incidents" muted />
        )}
        {data?.incidents ? (
          <MetricTile
            title="Open near-miss"
            value={data.incidents.nearMissOpenCount}
            href="/dashboard/incidents"
            emphasize={data.incidents.nearMissOpenCount > 0}
          />
        ) : (
          <MetricTile title="Open near-miss" value="—" href="/dashboard/incidents" muted />
        )}
        {data?.capas ? (
          <MetricTile
            title="Overdue CAPAs"
            value={data.capas.overdueCount}
            href="/dashboard/capa"
            emphasize={data.capas.overdueCount > 0}
          />
        ) : (
          <MetricTile title="Overdue CAPAs" value="—" href="/dashboard/capa" muted />
        )}
        {data?.training ? (
          <MetricTile
            title="Training expiring (30d)"
            value={data.training.expiringWithin30DaysCount}
            href="/dashboard/training"
            emphasize={data.training.expiringWithin30DaysCount > 0}
          />
        ) : (
          <MetricTile title="Training expiring (30d)" value="—" href="/dashboard/training" muted />
        )}
        {data?.auditFindings ? (
          <MetricTile
            title="Open audit NCs"
            value={data.auditFindings.openNonConformanceCount}
            href="/dashboard/audits"
            emphasize={data.auditFindings.openNonConformanceCount > 0}
          />
        ) : (
          <MetricTile title="Open audit NCs" value="—" href="/dashboard/audits" muted />
        )}
        {data?.environment?.obligationsReviewOverdue != null ? (
          <MetricTile
            title="Obligations review overdue"
            value={data.environment.obligationsReviewOverdue}
            href="/dashboard/environment"
            emphasize={data.environment.obligationsReviewOverdue > 0}
          />
        ) : (
          <MetricTile
            title="Obligations review overdue"
            value="—"
            href="/dashboard/environment"
            muted
          />
        )}
        {data?.incidents?.meanDaysToCloseSnapshot != null ? (
          <MetricTile
            title="Mean days to close (closed)"
            value={data.incidents.meanDaysToCloseSnapshot}
            href="/dashboard/incidents"
          />
        ) : data?.incidents ? (
          <MetricTile title="Mean days to close (closed)" value="—" href="/dashboard/incidents" />
        ) : null}
        {data?.fieldOperations ? (
          <MetricTile
            title="Active permits"
            value={data.fieldOperations.activePermitsCount}
            href="/dashboard/permits"
            emphasize={data.fieldOperations.activePermitsCount > 0}
          />
        ) : (
          <MetricTile title="Active PTW" value="—" href="/dashboard/permits" muted />
        )}
        {data?.fieldOperations ? (
          <MetricTile
            title="Permit approvals (open)"
            value={data.fieldOperations.pendingPermitApprovalCount}
            href="/dashboard/approvals"
            emphasize={data.fieldOperations.pendingPermitApprovalCount > 0}
          />
        ) : (
          <MetricTile title="Permit approvals (open)" value="—" href="/dashboard/approvals" muted />
        )}
        {data?.fieldOperations ? (
          <MetricTile
            title="Open observations"
            value={data.fieldOperations.nonClosedObservationCount}
            href="/dashboard/observations"
            emphasize={data.fieldOperations.nonClosedObservationCount > 0}
          />
        ) : (
          <MetricTile title="Open observations" value="—" href="/dashboard/observations" muted />
        )}
        {data?.fieldOperations ? (
          <MetricTile
            title="Observation follow-ups overdue"
            value={data.fieldOperations.observationFollowUpOverdueCount}
            href="/dashboard/observations"
            emphasize={data.fieldOperations.observationFollowUpOverdueCount > 0}
          />
        ) : (
          <MetricTile
            title="Observation follow-ups overdue"
            value="—"
            href="/dashboard/observations"
            muted
          />
        )}
        {data?.fieldOperations ? (
          <MetricTile
            title="Permits expiring (7d)"
            value={data.fieldOperations.activePermitsExpiringWithin7DaysCount}
            href="/dashboard/permits"
            emphasize={data.fieldOperations.activePermitsExpiringWithin7DaysCount > 0}
          />
        ) : (
          <MetricTile title="PTW expiring (7d)" value="—" href="/dashboard/permits" muted />
        )}
        {data?.fieldOperations ? (
          <MetricTile
            title="At-risk observations (90d)"
            value={data.fieldOperations.atRiskObservationCountLast90Days}
            href="/dashboard/observations"
          />
        ) : (
          <MetricTile
            title="At-risk observations (90d)"
            value="—"
            href="/dashboard/observations"
            muted
          />
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {monthSeries.length > 0 ? (
          <BarChart title="Incidents created by month" rows={monthSeries.map((m) => ({ label: m.month, value: m.count }))} />
        ) : null}
        {capaFunnelRows.length > 0 ? (
          <HorizontalBars title="CAPA register by status" rows={capaFunnelRows} />
        ) : null}
        {incidentTypeRows.length > 0 ? (
          <HorizontalBars title="All-time incidents by type" rows={incidentTypeRows} />
        ) : null}
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className={dfSectionHeading}>Metric glossary (v3)</h2>
        <dl className="mt-3 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-zinc-900">Open incidents</dt>
            <dd className="mt-0.5 text-zinc-600">
              Incidents not in <code className="rounded bg-zinc-100 px-1">closed</code> status.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Open near-miss</dt>
            <dd>Open incidents where type is <code className="rounded bg-zinc-100 px-1">near_miss</code>.</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Overdue CAPAs</dt>
            <dd>
              Corrective actions with a due date before today, excluding{" "}
              <code className="rounded bg-zinc-100 px-1">verified</code>.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Training expiring (30d)</dt>
            <dd>Training records with <code className="rounded bg-zinc-100 px-1">expires_on</code> on or before today + 30 days.</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Open audit NCs</dt>
            <dd>
              Minor or major nonconformities without a verified linked CAPA (including findings with no CAPA yet).
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Obligations review overdue</dt>
            <dd>
              Compliance obligations whose{" "}
              <code className="rounded bg-zinc-100 px-1">next_review_due</code> is before today.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Active permits</dt>
            <dd>
              Work permits in <code className="rounded bg-zinc-100 px-1">active</code> status.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Permit approvals (open)</dt>
            <dd>Open authorization chains for permits (approval requests not yet finalized).</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Open observations</dt>
            <dd>Safety observations in open or acknowledged status.</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Observations (30d)</dt>
            <dd>Observation records with observed date within the trailing 30 days.</dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Observation follow-ups overdue</dt>
            <dd>
              Open or acknowledged observations with a{" "}
              <code className="rounded bg-zinc-100 px-1">follow_up_due_at</code> in the past (program SLA;
              linked to escalation events when cron runs).
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Permits expiring (7d)</dt>
            <dd>
              <code className="rounded bg-zinc-100 px-1">active</code> permits whose{" "}
              <code className="rounded bg-zinc-100 px-1">valid_to</code> falls between the UTC start of
              today and the same boundary seven calendar days ahead.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">At-risk observations (90d)</dt>
            <dd>
              Observations categorized as{" "}
              <code className="rounded bg-zinc-100 px-1">at_risk_behavior</code> or{" "}
              <code className="rounded bg-zinc-100 px-1">unsafe_condition</code> observed in the trailing 90
              UTC days — leading-indicator volume only.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900">Mean days to close</dt>
            <dd>
              For closed incidents, mean of <code className="rounded bg-zinc-100 px-1">updated_at − created_at</code> in
              days (approximate cycle time).
            </dd>
          </div>
        </dl>
        <p className={`mt-4 ${dfHelperXs}`}>
          Sections you cannot read are omitted from the API response; CSV export includes only what you can see.{" "}
          <Link href="/dashboard" className="text-emerald-800 underline">
            Back to overview
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

function MetricTile({
  title,
  value,
  href,
  emphasize,
  muted,
}: {
  title: string;
  value: number | string;
  href: string;
  emphasize?: boolean;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block min-h-[5.5rem] rounded-lg border bg-white p-4 shadow-sm hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
        emphasize ? "border-amber-400 ring-1 ring-amber-200" : "border-zinc-200"
      } ${muted ? "opacity-80" : ""}`}
    >
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{value}</p>
    </Link>
  );
}
