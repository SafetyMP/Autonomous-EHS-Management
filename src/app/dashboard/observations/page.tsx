"use client";

import Link from "next/link";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { trpc } from "@/trpc/react";

export default function ObservationsPage() {
  const { organizationId } = useOrg();

  const { data: rows, isLoading } = trpc.observation.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Observations</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Safety observations"
        description="Leading indicators and field notes. These are not OSHA 300 log records unless you also file an incident."
        actions={
          <>
            <OrgSwitcher />
            <Link
              href="/dashboard/observations/new"
              className="inline-flex min-h-11 touch-target items-center rounded-md bg-emerald-700 px-4 py-2 text-base font-medium text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              Log observation
            </Link>
          </>
        }
      />

      {isLoading ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
          <span role="status" aria-live="polite" className="text-base text-zinc-600">
            Loading…
          </span>
        </div>
      ) : rows?.length === 0 ? (
        <DashboardEmptyState
          title="No observations yet"
          description="Log at-risk behaviors, unsafe conditions, or positive recognition to strengthen leading indicators."
          primaryHref="/dashboard/observations/new"
          primaryLabel="Log observation"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <caption className="sr-only">Safety observations for this organization</caption>
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Summary
                </th>
                <th scope="col" className="px-4 py-3">
                  Category
                </th>
                <th scope="col" className="px-4 py-3">
                  Severity
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  Observed
                </th>
                <th scope="col" className="px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows?.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <Link
                      href={`/dashboard/observations/${r.id}`}
                      className="text-emerald-900 underline decoration-emerald-800 underline-offset-2 hover:text-emerald-950"
                    >
                      {r.summary}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-zinc-800">{r.category.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 capitalize text-zinc-800">{r.severity}</td>
                  <td className="px-4 py-3 capitalize text-zinc-800">{r.status}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-800">
                    {new Date(r.observedAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/observations/${r.id}`}
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
