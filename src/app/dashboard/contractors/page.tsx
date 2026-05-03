"use client";

import Link from "next/link";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { dfMuted } from "@/lib/dashboard-field-styles";
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

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Contractors &amp; visitors</h1>
        <OrgSwitcher />
      </div>
    );
  }

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
