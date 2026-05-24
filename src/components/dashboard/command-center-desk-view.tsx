"use client";

import type { inferRouterOutputs } from "@trpc/server";
import Link from "next/link";
import { OrgSwitcher } from "@/components/org-switcher";
import { DashboardActionQueueHero } from "@/components/dashboard/dashboard-action-queue-hero";
import { DashboardActivityFeed } from "@/components/dashboard/dashboard-activity-feed";
import { CommandCenterCsvButton } from "@/components/dashboard/command-center-csv-button";
import { DashboardKpiTile } from "@/components/dashboard/dashboard-kpi-tile";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import {
  buildAttentionChips,
  COMMAND_CENTER_KPI_TILES,
  type CommandCenterOut,
} from "@/lib/dashboard/commandCenterSignals";
import type { AppRouter } from "@/server/trpc/root";

type ActionQueueOut = inferRouterOutputs<AppRouter>["tasks"]["actionQueue"];

type IntegrationFailedHealth = inferRouterOutputs<AppRouter>["integration"]["failedEventsHealth"];

const ONBOARDING_STEPS = [
  { key: "context_scope", label: "Organization context & scope (Clause 4)", href: "/dashboard/context" },
  { key: "environment", label: "Environmental aspects & obligations", href: "/dashboard/environment" },
  { key: "documents", label: "Controlled documents", href: "/dashboard/documents" },
  { key: "planning", label: "Hazards, risk & operational controls", href: "/dashboard/planning" },
  { key: "program_iso", label: "Program register (MOC, drills, CB audits)", href: "/dashboard/program" },
] as const;

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
  cc: CommandCenterOut | undefined;
  ccLoading: boolean;
  actionQueue: ActionQueueOut | undefined;
  actionQueueLoading: boolean;
  integrationHealth: IntegrationFailedHealth | undefined;
  doneKeys: Set<string>;
  onCompleteSetupStep: (stepKey: string) => void;
  completeSetupStepPending: boolean;
};

export function CommandCenterDeskView({
  organizationId,
  orgName,
  cc,
  ccLoading,
  actionQueue,
  actionQueueLoading,
  integrationHealth,
  doneKeys,
  onCompleteSetupStep,
  completeSetupStepPending,
}: CommandCenterDeskViewProps) {
  const attention = buildAttentionChips(cc?.kpis);

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
        <Link
          href="/dashboard?view=field"
          className="font-medium text-emerald-900 underline underline-offset-2"
        >
          Compact field menu
        </Link>{" "}
        — large buttons for incident, observation, inspection, and permit intake.
      </p>

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

      {integrationHealth && integrationHealth.failedCount > 0 ? (
        <section
          className="rounded-xl border border-red-200 bg-red-50/90 p-4 shadow-sm"
          aria-labelledby="dash-integration-failed-heading"
        >
          <h2 id="dash-integration-failed-heading" className="text-base font-semibold text-red-950">
            Integration backlog ({integrationHealth.failedCount} failed)
          </h2>
          <p className="mt-1 text-sm text-red-900">
            Oldest failure:{" "}
            {integrationHealth.oldestFailedCreatedAt
              ? new Date(integrationHealth.oldestFailedCreatedAt).toLocaleString()
              : "—"}
            . Retry from{" "}
            <Link
              href="/dashboard/integrations#integration-failed"
              className="font-medium underline decoration-red-800 underline-offset-2"
            >
              Integrations
            </Link>{" "}
            (needs <code className="rounded bg-red-100 px-1 text-xs">integration:write</code>).
          </p>
          <p className={`mt-2 text-xs text-red-900/90`}>
            Operator notes:{" "}
            <code className="rounded bg-red-100 px-1">docs/integration-connector-mapping.md</code>
          </p>
          <ul className="mt-3 divide-y divide-red-100 text-sm text-red-950">
            {integrationHealth.recentFailed.map((ev, idx) => (
              <li key={`${ev.id}-${idx}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className="font-medium">
                  {ev.eventType.startsWith("demo.") ? (
                    <span className="mr-1 rounded bg-red-200/80 px-1.5 py-0.5 text-xs font-semibold text-red-950">
                      Demo
                    </span>
                  ) : null}
                  {ev.eventType}{" "}
                  <span className="font-mono text-xs font-normal text-red-900/80">({ev.id.slice(0, 8)}…)</span>
                </span>
                <span className="tabular-nums text-xs text-red-900/90">
                  {new Date(ev.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {cc?.kpis?.cronHealth && cc.kpis.cronHealth.jobs.length > 0 ? (
        <section
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          aria-labelledby="dash-cron-health-heading"
        >
          <h2 id="dash-cron-health-heading" className="text-base font-semibold text-zinc-900">
            Scheduled job health (org admin)
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Latest completed run per deployment cron key. Humans and SRE own remediation. Runbooks:{" "}
            <code className="rounded bg-zinc-100 px-1 text-xs">docs/runbooks/cron-metrics-observability.md</code>
            {" · "}
            <code className="rounded bg-zinc-100 px-1 text-xs">docs/integration-connector-mapping.md</code>
            .
          </p>
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {cc.kpis.cronHealth.jobs.map((j) => (
              <li key={j.jobKey} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-mono text-xs text-zinc-800">{j.jobKey}</span>
                <span className="text-zinc-700">
                  {j.lastOk ? (
                    <span className="text-emerald-800">OK</span>
                  ) : (
                    <span className="font-medium text-red-800">Failed</span>
                  )}
                  <span className="ml-2 tabular-nums text-zinc-600">
                    {new Date(j.lastStartedAt).toLocaleString()} · {j.lastDurationMs} ms
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <DashboardSection id="dash-kpis" title="Key indicators" variant="muted">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <KpiBlock cc={cc} />
        </div>
      </DashboardSection>

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

          <DashboardSection id="dash-quick-actions" title="Quick actions" variant="muted">
            <DashboardQuickActions />
          </DashboardSection>
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
