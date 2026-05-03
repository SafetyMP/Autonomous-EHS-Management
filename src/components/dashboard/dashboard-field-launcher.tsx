"use client";

import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { OrgSwitcher } from "@/components/org-switcher";
import type { AppRouter } from "@/server/trpc/root";

type HomeLayoutOut = inferRouterOutputs<AppRouter>["organization"]["dashboardHomeLayout"];
type Perms = HomeLayoutOut["permissions"];

export function DashboardFieldLauncher({
  orgName,
  permissions,
}: {
  orgName?: string;
  permissions: Perms;
}) {
  const actions: { href: string; label: string; show: boolean }[] = [
    { href: "/dashboard/incidents/new", label: "Report incident", show: permissions.canIncidentCreate },
    {
      href: "/dashboard/observations/new",
      label: "Log observation",
      show: permissions.canObservationCreate,
    },
    {
      href: "/dashboard/inspections/new",
      label: "Start inspection",
      show: permissions.canInspectionCreate,
    },
    { href: "/dashboard/permits/new", label: "New permit", show: permissions.canPermitCreate },
  ];

  const lists: { href: string; label: string; show: boolean }[] = [
    { href: "/dashboard/incidents", label: "Incidents", show: permissions.canIncidentRead },
    {
      href: "/dashboard/observations",
      label: "Observations",
      show: permissions.canObservationRead,
    },
    {
      href: "/dashboard/inspections",
      label: "Inspections",
      show: permissions.canInspectionRead,
    },
    {
      href: "/dashboard/permits",
      label: "Permits to work",
      show: permissions.canPermitRead,
    },
  ];

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title={orgName ? `Field — ${orgName}` : "Field workspace"}
        description="Quick actions for intake in the field. Open the full dashboard for KPIs, approvals, and ISO setup."
        actions={<OrgSwitcher />}
      />

      <section aria-labelledby="field-primary-heading">
        <h2 id="field-primary-heading" className="mb-3 text-lg font-semibold text-zinc-900">
          Start here
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2" role="list">
          {actions
            .filter((a) => a.show)
            .map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className="flex min-h-[3.5rem] touch-target items-center justify-center rounded-xl border-2 border-emerald-800 bg-emerald-50 px-4 py-4 text-center text-lg font-semibold text-emerald-950 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                  {a.label}
                </Link>
              </li>
            ))}
        </ul>
        {actions.every((a) => !a.show) ? (
          <p className="mt-2 text-base text-zinc-700">
            You do not have intake permissions in this org. Ask an administrator to adjust your role,
            or use the full dashboard if you have broader access.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="field-lists-heading">
        <h2 id="field-lists-heading" className="mb-3 text-lg font-semibold text-zinc-900">
          Recent lists
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2" role="list">
          {lists
            .filter((a) => a.show)
            .map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className="flex min-h-11 touch-target items-center rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  {a.label}
                </Link>
              </li>
            ))}
        </ul>
      </section>

      <p className="text-center">
        <Link
          href="/dashboard?view=desk"
          className="inline-flex min-h-11 touch-target items-center justify-center rounded-lg border border-zinc-400 bg-white px-4 py-2 text-base font-semibold text-emerald-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          Full operations dashboard
        </Link>
      </p>
    </div>
  );
}
