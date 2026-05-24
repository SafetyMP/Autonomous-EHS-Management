"use client";

import Link from "next/link";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { dfMuted, dfPanelHeading } from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

const rowLinkClass =
  "font-medium text-emerald-900 underline decoration-emerald-800 underline-offset-2 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

export default function ContractorsPage() {
  const { organizationId } = useOrg();
  const org = organizationId!;

  const parties = trpc.program.listExternalParties.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );

  const renewalQueue = trpc.externalParty.listRenewalQueue.useQuery(
    { organizationId: org, withinDays: 30 },
    { enabled: !!organizationId },
  );

  const portfolio = trpc.externalParty.portfolioComplianceSummary.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Contractors &amp; visitors</h1>
        <OrgSwitcher />
      </div>
    );
  }

  const expired = renewalQueue.data?.filter((r) => r.queueStatus === "expired") ?? [];
  const dueSoon = renewalQueue.data?.filter((r) => r.queueStatus === "due_soon") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Contractors &amp; visitors</h1>
          <p className={`mt-1 ${dfMuted}`}>
            External parties (ISO 8.1.4). Open a record to track insurance, permits, and training
            proof. Evidence links are pointers—store files per your retention policy.
          </p>
        </div>
        <OrgSwitcher />
      </div>

      {portfolio.data ? (
        <section
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Contractor compliance summary"
        >
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Parties</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
              {portfolio.data.externalPartyCount}
            </p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-900">Expired</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-red-950">
              {portfolio.data.credentialsExpired}
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Due 30d</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-950">
              {portfolio.data.credentialsDueSoon30d}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Active</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-950">
              {portfolio.data.credentialsActive}
            </p>
          </div>
        </section>
      ) : null}

      {renewalQueue.data && renewalQueue.data.length > 0 ? (
        <section
          className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm"
          aria-label="Credential renewal queue"
        >
          <h2 className={dfPanelHeading}>Renewal queue (30 days)</h2>
          <p className={`mt-1 text-sm ${dfMuted}`}>
            {expired.length} expired · {dueSoon.length} expiring soon — prioritize COI and training
            proof before site access.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-700">
                <tr>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Credential</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {renewalQueue.data.map((row) => (
                  <tr key={row.credentialId}>
                    <td className="px-3 py-2 font-medium text-zinc-900">{row.companyName}</td>
                    <td className="px-3 py-2 capitalize text-zinc-800">
                      {row.kind.replace(/_/g, " ")}
                      {row.identifier ? ` · ${row.identifier}` : ""}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-zinc-800">
                      {new Date(row.validTo).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      {row.queueStatus === "expired" ? (
                        <span className="font-semibold text-red-800">Expired</span>
                      ) : (
                        <span className="text-amber-900">{row.daysUntilExpiry}d left</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/dashboard/contractors/${row.externalPartyId}`} className={rowLinkClass}>
                        Renew
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-base">
          <caption className="sr-only">External parties for this organization</caption>
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-800">
            <tr>
              <th scope="col" className="px-4 py-3">
                Company
              </th>
              <th scope="col" className="px-4 py-3">
                Type
              </th>
              <th scope="col" className="px-4 py-3">
                Contact
              </th>
              <th scope="col" className="px-4 py-3">
                Onboarded
              </th>
              <th scope="col" className="px-4 py-3">
                Detail
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {parties.isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6">
                  <span role="status" aria-live="polite" className="text-zinc-700">
                    Loading parties…
                  </span>
                </td>
              </tr>
            ) : parties.data?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-zinc-700">
                  No external parties yet. Add one under{" "}
                  <Link href="/dashboard/program" className={rowLinkClass}>
                    Program register
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              parties.data?.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900">{p.companyName}</td>
                  <td className="px-4 py-3 capitalize text-zinc-800">
                    {p.partyType.replace("_", " ")}
                  </td>
                  <td className="max-w-[14rem] truncate px-4 py-3 text-zinc-800">
                    {p.contactEmail ?? p.contactName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-800">
                    {p.onboardedAt
                      ? new Date(p.onboardedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/contractors/${p.id}`}
                      className={`${rowLinkClass} touch-target inline-flex min-h-11 items-center`}
                    >
                      Credentials
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
