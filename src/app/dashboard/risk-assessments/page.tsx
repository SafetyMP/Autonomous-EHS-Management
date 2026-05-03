"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  RISK_ASSESSMENT_KINDS,
  RISK_ASSESSMENT_STATUSES,
} from "@/lib/ehs-enums";
import { trpc } from "@/trpc/react";
import { dfHelperXs, dfMuted, dfSectionHeading } from "@/lib/dashboard-field-styles";

function formatKind(k: string) {
  return k.replaceAll("_", " ");
}

export default function RiskAssessmentsRosterPage() {
  const { organizationId } = useOrg();
  const [kind, setKind] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const listInput = useMemo(
    () => ({
      organizationId: organizationId!,
      assessmentKind:
        kind && RISK_ASSESSMENT_KINDS.includes(kind as (typeof RISK_ASSESSMENT_KINDS)[number])
          ? (kind as (typeof RISK_ASSESSMENT_KINDS)[number])
          : undefined,
      status:
        status &&
        RISK_ASSESSMENT_STATUSES.includes(status as (typeof RISK_ASSESSMENT_STATUSES)[number])
          ? (status as (typeof RISK_ASSESSMENT_STATUSES)[number])
          : undefined,
    }),
    [organizationId, kind, status],
  );

  const { data: rows, isLoading } = trpc.planning.risk.list.useQuery(listInput, {
    enabled: !!organizationId,
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Risk assessments</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Risk assessments"
        description="Task-based (JSA-style) and site-based registers—separate from permits to work. Full ISO planning tools remain under Planning."
        actions={
          <>
            <OrgSwitcher />
            <Link
              href="/dashboard/risk-assessments/new"
              className="inline-flex min-h-11 touch-target items-center rounded-md border border-emerald-700 bg-emerald-700 px-4 py-2 text-base font-medium text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              New assessment
            </Link>
            <Link
              href="/dashboard/planning"
              className="inline-flex min-h-11 touch-target items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-base font-medium text-zinc-800 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              Planning hub
            </Link>
          </>
        }
      />

      <section aria-label="Filters" className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className={dfSectionHeading}>Filter roster</h2>
        <div className="mt-3 flex flex-wrap gap-4">
          <div>
            <label htmlFor="ra-kind" className={dfHelperXs}>
              Kind
            </label>
            <select
              id="ra-kind"
              className="mt-1 block min-h-11 w-48 rounded-md border border-zinc-300 px-3 text-base text-zinc-900"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="">All kinds</option>
              {RISK_ASSESSMENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {formatKind(k)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ra-status" className={dfHelperXs}>
              Status
            </label>
            <select
              id="ra-status"
              className="mt-1 block min-h-11 w-48 rounded-md border border-zinc-300 px-3 text-base text-zinc-900"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              {RISK_ASSESSMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {formatKind(s)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className={`mt-2 ${dfMuted}`} id="ra-filter-hint">
          Open a record to edit steps and status. You can still add quick assessments from Planning.
        </p>
      </section>

      {isLoading ? (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
          <span role="status" aria-live="polite" className="text-base text-zinc-700">
            Loading…
          </span>
        </div>
      ) : rows?.length === 0 ? (
        <DashboardEmptyState
          title="No risk assessments match"
          description="Add hazards and assessments under Planning, or widen your filters."
          primaryHref="/dashboard/planning"
          primaryLabel="Open planning"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <caption className="sr-only">Risk assessment roster</caption>
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Title / context
                </th>
                <th scope="col" className="px-4 py-3">
                  Kind
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  Assessed
                </th>
                <th scope="col" className="px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows?.map((r) => (
                <tr key={r.id}>
                  <td className="max-w-md px-4 py-3 font-medium text-zinc-900">
                    <Link
                      href={`/dashboard/risk-assessments/${r.id}`}
                      className="text-emerald-900 underline decoration-emerald-800 underline-offset-2 hover:text-emerald-950"
                    >
                      {r.summaryTitle?.trim() || `${r.context.slice(0, 72)}${r.context.length > 72 ? "…" : ""}`}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-zinc-800">{formatKind(r.assessmentKind)}</td>
                  <td className="px-4 py-3 capitalize text-zinc-800">{formatKind(r.status)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-800">
                    {new Date(r.assessedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/risk-assessments/${r.id}`}
                      className="touch-target text-base font-medium text-emerald-800 underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
