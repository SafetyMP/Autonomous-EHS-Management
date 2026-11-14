"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useLayoutEffect, useRef } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { trpc } from "@/trpc/react";

export default function IncidentsPage() {
  return <Suspense fallback={<p role="status">Loading incidents…</p>}><IncidentsContent /></Suspense>;
}

function IncidentsContent() {
  const { organizationId } = useOrg();
  const searchParams = useSearchParams();
  const titleFilter = searchParams.get("q") ?? "";
  const filterInput = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    // The native input retains fast keystrokes while Next transitions the query.
    // Only synchronize navigation that still matches the browser URL; an older
    // transition must never overwrite characters typed since it was scheduled.
    const currentFilter = new URL(window.location.href).searchParams.get("q") ?? "";
    if (currentFilter === titleFilter && filterInput.current) {
      filterInput.current.value = titleFilter;
    }
  }, [titleFilter]);
  const incidentHref = (id: string) =>
    `/dashboard/incidents/${encodeURIComponent(id)}${titleFilter ? `?${new URLSearchParams({ incidentFilter: titleFilter })}` : ""}`;

  function updateFilter(value: string) {
    // Next synchronizes native history with useSearchParams. Keep this local filter
    // responsive without a server navigation or a history entry for every keystroke.
    window.history.replaceState(null, "", `/dashboard/incidents${value ? `?${new URLSearchParams({ q: value })}` : ""}`);
  }

  const { data: incidents, isLoading, error } = trpc.incident.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const query = titleFilter.trim().toLowerCase();
  const filtered = (incidents ?? []).filter((incident) => !query || incident.title.toLowerCase().includes(query));

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Incidents</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Incidents (ISO 45001)</h1>
        <div className="flex flex-wrap items-center gap-3">
          <OrgSwitcher />
          <Link
            href="/dashboard/incidents/new"
            className="inline-flex min-h-11 touch-target items-center rounded-md bg-emerald-700 px-4 py-2 text-base font-medium text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            Report incident
          </Link>
        </div>
      </div>

      <p className="text-sm text-zinc-600">
        Open a record to move it through <strong>investigating</strong> and closure; closure
        requires root cause and a documented justification. The roster is sorted by record creation
        time (newest first)—use the filter to find a title quickly (demo fixtures start with{" "}
        <strong>[Demo]</strong>).
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-zinc-700">
          <span className="font-medium">Filter by title</span>
          <input
            type="search"
            ref={filterInput}
            defaultValue={titleFilter}
            onChange={(e) => updateFilter(e.target.value)}
            placeholder='e.g. "fall" or "[Demo]"'
            className="min-h-11 w-full min-w-0 rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            autoComplete="off"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <caption className="sr-only">
            Incidents logged for the current workspace. Columns include title, severity, status, and
            actions.
          </caption>
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700">
            <tr>
              <th scope="col" className="px-4 py-3">
                Title
              </th>
              <th scope="col" className="px-4 py-3">
                Severity
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6">
                  <span role="status" aria-live="polite" className="text-base text-zinc-600">
                    Loading incidents…
                  </span>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="px-4 py-6">
                  <p role="alert" className="text-base text-red-800">Unable to load incidents: {error.message}</p>
                </td>
              </tr>
            ) : incidents?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-base text-zinc-700">
                  No incidents logged yet.
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-base text-zinc-700">
                  No incidents match this filter. Clear the search box or try another phrase (demo
                  fall-from-height title includes “Fall from height” and “packaging mezzanine”).
                </td>
              </tr>
            ) : (
              filtered.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <Link
                      href={incidentHref(i.id)}
                      className="text-emerald-900 underline decoration-emerald-800 underline-offset-2 hover:text-emerald-950"
                    >
                      {i.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{i.severity}</td>
                  <td className="px-4 py-3 capitalize">{i.status.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={incidentHref(i.id)}
                      className="touch-target text-base font-medium text-emerald-800 underline decoration-emerald-700 underline-offset-2 hover:bg-emerald-50"
                    >
                      Open record
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
