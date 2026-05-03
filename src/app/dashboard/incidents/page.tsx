"use client";

import Link from "next/link";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { trpc } from "@/trpc/react";

export default function IncidentsPage() {
  const { organizationId } = useOrg();

  const { data: incidents, isLoading } = trpc.incident.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

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
        requires root cause and a documented justification.
      </p>

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
            ) : incidents?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-base text-zinc-700">
                  No incidents logged yet.
                </td>
              </tr>
            ) : (
              incidents?.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <Link
                      href={`/dashboard/incidents/${i.id}`}
                      className="text-emerald-900 underline decoration-emerald-800 underline-offset-2 hover:text-emerald-950"
                    >
                      {i.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{i.severity}</td>
                  <td className="px-4 py-3 capitalize">{i.status.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/incidents/${i.id}`}
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
