"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  ENVIRONMENTAL_REGULATORY_PERMIT_MEDIA,
  ENVIRONMENTAL_REGULATORY_PERMIT_STATUS,
} from "@/lib/ehs-enums";
import { dfHelperXs, dfMuted, dfSectionHeading } from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

function formatLabel(v: string) {
  return v.replaceAll("_", " ");
}

export default function EnvironmentalPermitsRosterPage() {
  const { organizationId } = useOrg();
  const [status, setStatus] = useState<string>("");
  const [media, setMedia] = useState<string>("");
  const [siteId, setSiteId] = useState<string>("");

  const { data: sites } = trpc.organization.sites.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const listInput = useMemo(
    () => ({
      organizationId: organizationId!,
      status:
        status &&
        ENVIRONMENTAL_REGULATORY_PERMIT_STATUS.includes(
          status as (typeof ENVIRONMENTAL_REGULATORY_PERMIT_STATUS)[number],
        )
          ? (status as (typeof ENVIRONMENTAL_REGULATORY_PERMIT_STATUS)[number])
          : undefined,
      media:
        media &&
        ENVIRONMENTAL_REGULATORY_PERMIT_MEDIA.includes(
          media as (typeof ENVIRONMENTAL_REGULATORY_PERMIT_MEDIA)[number],
        )
          ? (media as (typeof ENVIRONMENTAL_REGULATORY_PERMIT_MEDIA)[number])
          : undefined,
      siteId: siteId || undefined,
    }),
    [organizationId, status, media, siteId],
  );

  const { data: rows, isLoading } = trpc.environmentalRegulatoryPermit.list.useQuery(listInput, {
    enabled: !!organizationId,
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Environmental permits</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Environmental permits"
        description="Regulatory air / water / waste permit register (program record—not filings). Distinct from permits to work under Field and risk."
        actions={
          <>
            <OrgSwitcher />
            <Link
              href="/dashboard/environment"
              className="inline-flex min-h-11 touch-target items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-base font-medium text-zinc-800 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              Environment hub
            </Link>
            <Link
              href="/dashboard/environmental-permits/new"
              className="inline-flex min-h-11 touch-target items-center rounded-md border border-emerald-700 bg-emerald-700 px-4 py-2 text-base font-medium text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              New permit
            </Link>
          </>
        }
      />

      <section aria-label="Filters" className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className={dfSectionHeading}>Filter roster</h2>
        <div className="mt-3 flex flex-wrap gap-4">
          <div>
            <label htmlFor="ep-status" className={dfHelperXs}>
              Status
            </label>
            <select
              id="ep-status"
              className="mt-1 block min-h-11 w-48 rounded-md border border-zinc-300 px-3 text-base text-zinc-900"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              {ENVIRONMENTAL_REGULATORY_PERMIT_STATUS.map((s) => (
                <option key={s} value={s}>
                  {formatLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ep-media" className={dfHelperXs}>
              Media
            </label>
            <select
              id="ep-media"
              className="mt-1 block min-h-11 w-48 rounded-md border border-zinc-300 px-3 text-base text-zinc-900"
              value={media}
              onChange={(e) => setMedia(e.target.value)}
            >
              <option value="">All media</option>
              {ENVIRONMENTAL_REGULATORY_PERMIT_MEDIA.map((m) => (
                <option key={m} value={m}>
                  {formatLabel(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ep-site" className={dfHelperXs}>
              Site
            </label>
            <select
              id="ep-site"
              className="mt-1 block min-h-11 w-56 rounded-md border border-zinc-300 px-3 text-base text-zinc-900"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
            >
              <option value="">All sites</option>
              {sites?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className={`mt-2 ${dfMuted}`} id="ep-filter-hint">
          Internal register for renewal tracking and links to monitoring and obligations. See COMPLIANCE for scope.
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
          title="No permits match"
          description="Add a regulatory permit record, or widen filters."
          primaryHref="/dashboard/environmental-permits/new"
          primaryLabel="New environmental permit"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <caption className="sr-only">Environmental regulatory permit roster</caption>
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Title
                </th>
                <th scope="col" className="px-4 py-3">
                  Identifier
                </th>
                <th scope="col" className="px-4 py-3">
                  Media
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  Expires
                </th>
                <th scope="col" className="px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows?.map((r) => (
                <tr key={r.id}>
                  <td className="max-w-xs px-4 py-3 font-medium text-zinc-900">
                    <Link
                      href={`/dashboard/environmental-permits/${r.id}`}
                      className="text-emerald-900 underline decoration-emerald-800 underline-offset-2 hover:text-emerald-950"
                    >
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-800">{r.permitIdentifier}</td>
                  <td className="px-4 py-3 capitalize text-zinc-800">{r.media}</td>
                  <td className="px-4 py-3 capitalize text-zinc-800">{formatLabel(r.status)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-800">
                    {r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/environmental-permits/${r.id}`}
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
