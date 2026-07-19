"use client";

import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import { DashboardActionQueueFieldStrip } from "@/components/dashboard/dashboard-action-queue-field-strip";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { OrgSwitcher } from "@/components/org-switcher";
import type { AppRouter } from "@/server/trpc/root";

type HomeLayoutOut = inferRouterOutputs<AppRouter>["organization"]["dashboardHomeLayout"];
type ActionQueueOut = inferRouterOutputs<AppRouter>["tasks"]["actionQueue"];
type Perms = HomeLayoutOut["permissions"];

export function DashboardFieldLauncher({
  orgName,
  permissions,
  actionQueue,
  actionQueueLoading,
}: {
  orgName?: string;
  permissions: Perms;
  actionQueue?: ActionQueueOut;
  actionQueueLoading?: boolean;
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
      label: "Work permits (PTW)",
      show: permissions.canPermitRead,
    },
  ];

  const visibleActions = actions.filter((a) => a.show);
  /** AC-004: ≤1 filled primary in the Start-here action region. */
  const [leadAction, ...secondaryActions] = visibleActions;

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title={orgName ? `Field — ${orgName}` : "Field workspace"}
        description="Quick actions for intake in the field. Open the full dashboard for KPIs, approvals, and ISO setup."
        actions={<OrgSwitcher />}
      />

      <section aria-labelledby="field-primary-heading" data-stress-action-region="field-today">
        <h2 id="field-primary-heading" className="mb-3 text-lg font-semibold text-foreground">
          Start here
        </h2>
        {leadAction ? (
          <ul className="grid gap-3" role="list">
            <li>
              <Link href={leadAction.href} className="btn-primary-soft touch-target">
                {leadAction.label}
              </Link>
            </li>
            {secondaryActions.length > 0 ? (
              <li>
                <ul className="grid gap-2 sm:grid-cols-2" role="list">
                  {secondaryActions.map((a) => (
                    <li key={a.href}>
                      <Link href={a.href} className="btn-secondary w-full touch-target">
                        {a.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="mt-2 text-base text-text-muted">
            You do not have intake permissions in this org. Ask an administrator to adjust your role,
            or use the full dashboard if you have broader access.
          </p>
        )}
      </section>

      <DashboardActionQueueFieldStrip
        queue={actionQueue}
        loading={actionQueueLoading ?? false}
      />

      <section aria-labelledby="field-lists-heading">
        <h2 id="field-lists-heading" className="mb-3 text-lg font-semibold text-foreground">
          Recent lists
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2" role="list">
          {lists
            .filter((a) => a.show)
            .map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className="flex min-h-11 touch-target items-center rounded-lg border border-border-strong bg-surface px-4 py-3 text-base font-medium text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {a.label}
                </Link>
              </li>
            ))}
        </ul>
      </section>

      <p className="text-center text-xs text-text-subtle">
        Pending work is ranked on the command center and in{" "}
        <Link href="/dashboard/tasks" className="font-medium text-primary underline underline-offset-2">
          Tasks &amp; reviews
        </Link>
        .
      </p>

      <p className="text-center">
        <Link
          href="/dashboard?view=desk"
          className="btn-secondary touch-target inline-flex"
        >
          Full operations dashboard
        </Link>
      </p>
    </div>
  );
}
