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

/**
 * Field Today — Capture intake CTAs + pending strip only (AC-CF-D009).
 * Forbidden: KPI tiles, activity feed, programme updates, management panels.
 */
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

  const visibleActions = actions.filter((a) => a.show);
  /** AC-004 / AC-CF-D009: ≤1 filled primary-soft in the Start-here action region. */
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

      <p className="text-center">
        <Link href="/dashboard?view=desk" className="btn-secondary touch-target inline-flex">
          Full operations dashboard
        </Link>
      </p>
    </div>
  );
}
