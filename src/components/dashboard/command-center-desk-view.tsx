"use client";

import type { inferRouterOutputs } from "@trpc/server";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CorporateOverviewSummary } from "@/components/dashboard/corporate-overview-summary";
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
  defaultKpiOpenForBreakpoint,
  readKpiDisclosurePreference,
  writeKpiDisclosurePreference,
} from "@/components/dashboard/kpi-disclosure-preference";
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

const ATTENTION_INITIAL = 5;
const ACTIVITY_INITIAL = 5;

function KpiBlock({ cc }: { cc: CommandCenterOut | undefined }) {
  const k = cc?.kpis;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
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
    </div>
  );
}

function KpiSection({
  cc,
  open,
  onOpenChange,
}: {
  cc: CommandCenterOut | undefined;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  return (
    <details
      id="dash-kpis"
      data-section="kpis"
      className="rounded-lg border border-border bg-surface-muted shadow-sm open:bg-surface"
      open={open}
      onToggle={(e) => {
        const next = e.currentTarget.open;
        if (next !== open) onOpenChange(next);
      }}
    >
      <summary className="cursor-pointer touch-target list-none rounded-lg px-5 py-4 text-base font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus marker:text-primary">
        Key indicators (program snapshot)
      </summary>
      {/* Mount tiles only when open so [data-kpi-tile] cannot paint while collapsed (AC-CF-D004). */}
      {open ? (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <KpiBlock cc={cc} />
        </div>
      ) : null}
    </details>
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
  ccError?: string;
  actionQueue: ActionQueueOut | undefined;
  actionQueueLoading: boolean;
  actionQueueError?: string;
  doneKeys: Set<string>;
  onCompleteSetupStep: (stepKey: string) => void;
  completeSetupStepPending: boolean;
  /** Persist field home preference when the Compact field menu link is used. */
  onPreferFieldLayout?: () => void;
};

export function CommandCenterDeskView({
  organizationId,
  orgName,
  persona,
  isAdmin,
  canIntegrationRead,
  cc,
  ccLoading,
  ccError,
  actionQueue,
  actionQueueLoading,
  actionQueueError,
  doneKeys,
  onCompleteSetupStep,
  completeSetupStepPending,
  onPreferFieldLayout,
}: CommandCenterDeskViewProps) {
  const actionQueueHasPersonalWork = (actionQueue?.totalCount ?? 0) > 0;
  const attention = filterAttentionChipsForActionQueue(
    buildAttentionChips(cc?.kpis),
    actionQueueHasPersonalWork,
  );
  const showQuickActions = persona === "desk_supervisor";
  const showPortCo = persona === "desk_supervisor";

  /** First paint always closed (density gates / cleared storage). Restore preference after mount. */
  const [kpiOpen, setKpiOpen] = useState(false);
  const [showAllAttention, setShowAllAttention] = useState(false);
  const [activityVisible, setActivityVisible] = useState(ACTIVITY_INITIAL);

  useEffect(() => {
    const stored = readKpiDisclosurePreference();
    let next = false;
    if (stored === "open") next = true;
    else if (stored === "closed") next = false;
    else next = defaultKpiOpenForBreakpoint(typeof window !== "undefined" ? window.innerWidth : 0);
    /* eslint-disable react-hooks/set-state-in-effect -- client-only KPI disclosure restore (UR-CF-010); first paint stays closed for density gates */
    setKpiOpen(next);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function handleKpiOpenChange(next: boolean) {
    setKpiOpen(next);
    writeKpiDisclosurePreference(next ? "open" : "closed");
  }

  const visibleAttention = showAllAttention
    ? attention
    : attention.slice(0, ATTENTION_INITIAL);
  const hiddenAttentionCount = Math.max(0, attention.length - ATTENTION_INITIAL);

  const activityItems =
    cc?.activityFeed?.map((a) => ({
      kind: a.kind,
      title: a.title,
      path: a.path,
      occurredAt: a.occurredAt,
      meta: a.meta,
    })) ?? [];
  const visibleActivity = activityItems.slice(0, activityVisible);
  const hasMoreActivity = activityItems.length > activityVisible;

  const onboardingIncomplete = ONBOARDING_STEPS.some((step) => !doneKeys.has(step.key));

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Corporate overview"
        description={orgName ? `Priorities and follow-through for ${orgName}.` : "Your organization’s priorities and follow-through."}

      />

      <p className="-mt-4 text-sm text-text-muted">
        {persona === "desk_contributor"
          ? "Start with your assigned work. Counts reflect records you can access."
          : "Review what needs attention, then follow each item through to verified action."}
      </p>

      {ccError ? <p role="alert" className="rounded-lg border border-danger bg-danger-surface p-4 text-danger">{ccError}</p> : null}
      <CorporateOverviewSummary snapshot={ccError ? undefined : cc} />

      {ccLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-border bg-surface p-8 text-lg text-text-muted"
        >
          Loading operations snapshot…
        </div>
      ) : null}

      {cc?.generatedAt ? (
        <p className="-mt-6 text-xs text-text-subtle">
          Snapshot as of{" "}
          <time dateTime={cc.generatedAt}>{new Date(cc.generatedAt).toLocaleString()}</time>
        </p>
      ) : null}

      {/* Slot order (AC-CF-D007): action queue → KPIs → onboarding → program updates → activity.
          Secondary clusters use closed <details> so AC-CF-D005 ≤12 controls stays reachable. */}
      <DashboardActionQueueHero queue={actionQueue} loading={actionQueueLoading} error={actionQueueError} />

      {attention.length > 0 && !ccError ? (
        <section aria-labelledby="corporate-attention-title" className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="corporate-attention-title" className="text-lg font-semibold text-foreground">Needs attention</h2>
            <span className="text-sm text-text-muted">{attention.length} {attention.length === 1 ? "category" : "categories"}</span>
          </div>
          <ul className="divide-y divide-border">
            {attention.slice(0, 3).map((chip) => (
              <li key={chip.id}>
                <Link href={chip.href} className="flex min-h-11 items-center justify-between gap-3 rounded-md py-3 text-sm font-medium text-primary hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
                  {chip.label}<span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
          {attention.length > 3 ? (
            <details className="mt-2 border-t border-border pt-2">
              <summary className="touch-target cursor-pointer py-2 text-sm font-semibold text-primary">More attention items ({attention.length - 3})</summary>
              <ul className="space-y-2 py-2">
                {visibleAttention.slice(3).map((chip) => <li key={chip.id}><Link href={chip.href} className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-2">{chip.label}</Link></li>)}
              </ul>
              {hiddenAttentionCount > 0 && !showAllAttention ? (
                <button type="button" className="btn-secondary" onClick={() => setShowAllAttention(true)}>Show {hiddenAttentionCount} more</button>
              ) : null}
            </details>
          ) : null}
        </section>
      ) : null}

      <KpiSection cc={cc} open={kpiOpen} onOpenChange={handleKpiOpenChange} />

      {onboardingIncomplete ? (
        <details
          data-section="onboarding"
          className="rounded-lg border border-border bg-surface shadow-sm open:shadow"
        >
          <summary className="cursor-pointer rounded-lg px-5 py-4 text-base font-semibold text-foreground hover:bg-surface-muted touch-target outline-none marker:text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus">
            <span id="dash-onboarding-summary">ISO setup checklist</span>
            <span className="sr-only"> — expandable</span>
          </summary>
          <div className="border-t border-border px-5 pb-5 pt-4">
            <p className="mb-4 text-sm text-text-muted">
              Track rollout steps when you are aligning the management system—expand and mark items
              complete for your org.
            </p>
            <ul className="divide-y divide-border text-base">
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
                            ? "border-primary bg-primary font-bold text-primary-fg"
                            : "border-border-strong text-text-subtle"
                        }`}
                        aria-hidden
                      >
                        {done ? "✓" : ""}
                      </span>
                      <Link
                        href={step.href}
                        className="min-h-11 touch-target rounded-md py-2 text-base font-medium text-primary underline-offset-4 hover:underline hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:text-sm"
                      >
                        {step.label}
                      </Link>
                    </div>
                    {!done ? (
                      <button
                        type="button"
                        className="touch-target shrink-0 rounded-md border border-border-strong px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
                        disabled={completeSetupStepPending}
                        onClick={() => onCompleteSetupStep(step.key)}
                      >
                        Mark done
                      </button>
                    ) : (
                      <span className="text-xs text-text-subtle">Complete</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </details>
      ) : null}

      {/* One closed disclosure for secondary clusters keeps AC-CF-D005 ≤12 while
          preserving slot order: program updates → activity → supervisor extras. */}
      <details
        data-section="more-on-today"
        className="rounded-lg border border-border bg-surface shadow-sm"
      >
        <summary className="cursor-pointer touch-target list-none rounded-lg px-5 py-4 text-base font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          Program activity & tools
        </summary>
        <div className="space-y-8 border-t border-border px-5 pb-5 pt-4">
          <div data-section="program-updates">
            <h3 className="mb-3 text-base font-semibold text-foreground">Program updates</h3>
            <DashboardProgramUpdates
              isAdmin={isAdmin}
              canIntegrationRead={canIntegrationRead}
              persona={persona}
            />
          </div>

          <div data-section="activity" id="dash-activity">
            <DashboardSection
              id="dash-activity-panel"
              title="Recent activity"
              description="Latest updates across modules you can read. Links open the record detail."
            >
              <DashboardActivityFeed items={visibleActivity} />
              {hasMoreActivity ? (
                <button
                  type="button"
                  className="mt-3 text-sm font-semibold text-primary underline underline-offset-2"
                  onClick={() => setActivityVisible((n) => n + ACTIVITY_INITIAL)}
                >
                  Load more activity
                </button>
              ) : null}
            </DashboardSection>
          </div>

          {showQuickActions ? (
            <div id="dash-quick-actions">
              <h3 className="mb-3 text-base font-semibold text-foreground">Quick actions</h3>
              <DashboardQuickActions />
            </div>
          ) : null}

          {showPortCo ? (
            <div>
              <h3 className="mb-3 text-base font-semibold text-foreground">PortCo pilot proof</h3>
              <PortCoPilotProofPanel />
            </div>
          ) : null}

          {cc ? (
            <div>
              <h3 className="mb-3 text-base font-semibold text-foreground">Export</h3>
              <CommandCenterCsvButton organizationId={organizationId} snapshot={cc} />
            </div>
          ) : null}

          <p className="text-center text-xs text-text-subtle">
            <Link
              href="/dashboard/analytics"
              className="font-medium text-primary underline underline-offset-2"
            >
              Full safety &amp; metrics dashboard →
            </Link>
          </p>
        </div>
      </details>
      <p className="text-sm text-text-muted">
        Working in the field?{" "}
        <Link href="/dashboard?view=field" onClick={() => onPreferFieldLayout?.()} className="font-medium text-primary underline underline-offset-2">Open the field workspace</Link>
      </p>
    </div>
  );
}
