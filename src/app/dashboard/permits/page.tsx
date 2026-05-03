"use client";

import Link from "next/link";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { trpc } from "@/trpc/react";

export default function PermitsPage() {
  const { organizationId } = useOrg();
  const { data: rows, isLoading } = trpc.permit.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Permits to work</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Work permits"
        description="Controlled work authorizations (draft → approval → active). Use the Approvals inbox when you are named approver."
        actions={
          <>
            <OrgSwitcher />
            <Link
              href="/dashboard/permits/new"
              className="inline-flex min-h-11 touch-target items-center rounded-md bg-emerald-700 px-4 py-2 text-base font-medium text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              New permit
            </Link>
          </>
        }
      />

      {isLoading ? (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
          <span role="status" aria-live="polite" className="text-base text-zinc-600">
            Loading…
          </span>
        </div>
      ) : rows?.length === 0 ? (
        <DashboardEmptyState
          title="No permits yet"
          description="Draft a controlled work authorization to route it through approvals and activate it once authorized."
          primaryHref="/dashboard/permits/new"
          primaryLabel="Create permit"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <caption className="sr-only">Work permits for this organization</caption>
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-700">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Title
                </th>
                <th scope="col" className="px-4 py-3">
                  Type
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  Valid
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
                      href={`/dashboard/permits/${r.id}`}
                      className="text-emerald-900 underline decoration-emerald-800 underline-offset-2 hover:text-emerald-950"
                    >
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-zinc-800">{r.permitType.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 capitalize text-zinc-800">{r.status.replaceAll("_", " ")}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-800">
                    {new Date(r.validFrom).toLocaleDateString()} –{" "}
                    {new Date(r.validTo).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/permits/${r.id}`}
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
