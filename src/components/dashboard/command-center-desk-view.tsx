"use client";

import type { inferRouterOutputs } from "@trpc/server";
import Link from "next/link";
import { OrgSwitcher } from "@/components/org-switcher";
import { DashboardProgramUpdates } from "@/components/dashboard/dashboard-program-updates";
import { DashboardActionQueueHero } from "@/components/dashboard/dashboard-action-queue-hero";
import { DashboardActivityFeed } from "@/components/dashboard/dashboard-activity-feed";
import { CommandCenterCsvButton } from "@/components/dashboard/command-center-csv-button";
import { PortCoPilotProofPanel } from "@/components/dashboard/portco-pilot-proof-panel";
import { DashboardKpiTile } from "@/components/dashboard/dashboard-kpi-tile";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import {
  buildAttentionChips,
  COMMAND_CENTER_KPI_TILES,
  filterAttentionChipsForActionQueue,
  type CommandCenterOut,
} from "@/lib/dashboard/commandCenterSignals";
import type { AppRouter } from "@/server/trpc/root";

type ActionQueueOut = inferRouterOutputs<AppRouter>["tasks"]["actionQueue"];

const ONBOARDING_STEPS = [
  { key: "context_scope", label: "Organization context & scope (Clause 4)", href: "/dashboard/context" },
  { key: "environment", label: "Environmental aspects & obligations", href: "/dashboard/environment" },
  { key: "documents", label: "Controlled documents", href: "/dashboard/documents" },
  { key: "planning", label: "Hazards, risk & operational controls", href: "/dashboard/planning" },
  { key: "program_iso", label: "Program register (MOC, drills, CB audits)", href: "/dashboard/program" },
] as const;

function KpiSection({ cc, collapsed }: { cc: CommandCenterOut | undefined; collapsed: boolean }) {
  const grid = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      <KpiBlock cc={cc} />
    </div>
  );

  if (!collapsed) {
    return (
      <DashboardSection id="dash-kpis" title="Key indicators" variant="muted">
        {grid}
      </DashboardSection>
    );
  }

  return (
    <details className="rounded-lg border border-zinc-200 bg-zinc-50 shadow-sm open:bg-white">
      <summary className="cursor-pointer touch-target list-none rounded-lg px-5 py-4 text-base font-semibold text-zinc-900 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 marker:text-emerald-800">
        Key indicators (program snapshot)
      </summary>
      <div id="dash-kpis" className="border-t border-zinc-100 px-5 pb-5 pt-4">
        {grid}
      </div>
    </details>
  );
}

function KpiBlock({ cc }: { cc: CommandCenterOut | undefined }) {
  const k = cc?.kpis;
  return (
    <>
      {COMMAND_CENTER_KPI_TILES.map((tile) => (
        <DashboardKpiTile
          key={tile.key}
          title={tile.title}
          value={tile.value(k)}
          href={tile.href}
          emphasize={tile.emphasize?.(k)}
          sublabel={tile.sublabel?.(k)}
        />
      ))}
    </>
  );
}

export type CommandCenterDeskViewProps = {
  organizationId: string;
  orgName: string | undefined;
  persona: "desk_contributor" | "desk_supervisor";
  isAdmin: boolean;
  canIntegrationRead: boolean;
  cc: CommandCenterOut | undefined;
  ccLoading: boolean;
  actionQueue: ActionQueueOut | undefined;
  actionQueueLoading: boolean;
  doneKeys: Set<string>;
  onCompleteSetupStep: (stepKey: string) => void;
  completeSetupStepPending: boolean;
};

export function CommandCenterDeskView({
  organizationId,
  orgName,
  persona,
  isAdmin,
  canIntegrationRead,
  cc,
  ccLoading,
  actionQueue,
  actionQueueLoading,
  doneKeys,
  onCompleteSetupStep,
  completeSetupStepPending,
}: CommandCenterDeskViewProps) {
  const actionQueueHasPersonalWork = (actionQueue?.totalCount ?? 0) > 0;
  const attention = filterAttentionChipsForActionQueue(
    buildAttentionChips(cc?.kpis),
    actionQueueHasPersonalWork,
  );
  const showFullKpis = persona === "desk_supervisor";
  const showQuickActions = persona === "desk_supervisor";

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title={orgName ? `Operations — ${orgName}` : "Operations command center"}
        description="Permission-scoped snapshot of open work, approvals, permits, inspections, and recent activity across your IMS."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-3">
            {cc ? <CommandCenterCsvButton organizationId={organizationId} snapshot={cc} /> : null}
            <OrgSwitcher />
          </div>
        }
      />

      <p className="-mt-4 text-xs text-zinc-700">
        {persona === "desk_contributor" ? (
          <>
            Your assigned work is ranked below. Program KPIs are collapsed — expand when you need the
            full picture.{" "}
          </>
        ) : null}
        <Link
          href="/dashboard?view=field"
          className="font-medium text-emerald-900 underline underline-offset-2"
        >
          Compact field menu
        </Link>{" "}
        — large buttons for incident, observation, inspection, and permit intake.
      </p>

      <DashboardProgramUpdates
        isAdmin={isAdmin}
        canIntegrationRead={canIntegrationRead}
        persona={persona}
      />

      <DashboardActionQueueHero queue={actionQueue} loading={actionQueueLoading} />

      {ccLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-zinc-200 bg-white p-8 text-lg text-zinc-600"
        >
          Loading operations snapshot…
        </div>
      ) : null}

      {cc?.generatedAt ? (
        <p className="-mt-6 text-xs text-zinc-500">
          Snapshot as of{" "}
          <time dateTime={cc.generatedAt}>{new Date(cc.generatedAt).toLocaleString()}</time>
        </p>
      ) : null}

      {attention.length > 0 ? (
        <div
          role="region"
          aria-label="Attention items"
          className="flex flex-wrap gap-2 rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-3"
        >
          <span className="text-sm font-semibold text-amber-950">Needs attention:</span>
          <ul className="flex flex-wrap gap-2" role="list">
            {attention.map((chip) => (
              <li key={chip.id}>
                <Link
                  href={chip.href}
                  className="inline-flex min-h-9 touch-target items-center rounded-full border border-amber-300 bg-white px-3 py-1 text-sm font-medium text-amber-950 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  {chip.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <KpiSection cc={cc} collapsed={!showFullKpis} />

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <DashboardSection
            id="dash-activity"
            title="Recent activity"
            description="Latest updates across modules you can read. Links open the record detail."
          >
            <DashboardActivityFeed
              items={
                cc?.activityFeed?.map((a) => ({
                  kind: a.kind,
                  title: a.title,
                  path: a.path,
                  occurredAt: a.occurredAt,
                  meta: a.meta,
                })) ?? []
              }
            />
          </DashboardSection>

          {showQuickActions ? (
            <DashboardSection id="dash-quick-actions" title="Quick actions" variant="muted">
              <DashboardQuickActions />
            </DashboardSection>
          ) : null}
        </div>

        <aside className="space-y-4 xl:col-span-5" aria-labelledby="dash-onboarding-summary">
          <details className="rounded-lg border border-zinc-200 bg-white shadow-sm open:shadow">
            <summary className="cursor-pointer rounded-lg px-5 py-4 text-base font-semibold text-zinc-900 hover:bg-zinc-50 touch-target outline-none marker:text-emerald-800 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600">
              <span id="dash-onboarding-summary">ISO setup checklist</span>
              <span className="sr-only"> — expandable</span>
            </summary>
            <div className="border-t border-zinc-100 px-5 pb-5 pt-4">
              <p className="mb-4 text-sm text-zinc-600">
                Track rollout steps when you are aligning the management system—expand and mark items complete for your org.
              </p>
              <ul className="divide-y divide-zinc-100 text-base">
                {ONBOARDING_STEPS.map((step) => {
                  const done = doneKeys.has(step.key);
                  return (
                    <li
                      key={step.key}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
                            done
                              ? "border-emerald-600 bg-emerald-600 font-bold text-white"
                              : "border-zinc-300 text-zinc-400"
                          }`}
                          aria-hidden
                        >
                          {done ? "✓" : ""}
                        </span>
                        <Link
                          href={step.href}
                          className="min-h-11 touch-target rounded-md py-2 text-base font-medium text-emerald-900 underline-offset-4 hover:underline hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:text-sm"
                        >
                          {step.label}
                        </Link>
                      </div>
                      {!done ? (
                        <button
                          type="button"
                          className="touch-target shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50"
                          disabled={completeSetupStepPending}
                          onClick={() => onCompleteSetupStep(step.key)}
                        >
                          Mark done
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400">Complete</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </details>

          {showFullKpis ? <PortCoPilotProofPanel /> : null}

          <p className="text-center text-xs text-zinc-500 xl:text-right">
            <Link href="/dashboard/analytics" className="font-medium text-emerald-900 underline underline-offset-2">
              Full safety &amp; metrics dashboard →
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
