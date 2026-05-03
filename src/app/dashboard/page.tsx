"use client";

import Link from "next/link";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { trpc } from "@/trpc/react";

const OPEN_INCIDENTS_FALLBACK = "—";

const ONBOARDING_STEPS = [
  { key: "context_scope", label: "Organization context & scope (Clause 4)", href: "/dashboard/context" },
  { key: "environment", label: "Environmental aspects & obligations", href: "/dashboard/environment" },
  { key: "documents", label: "Controlled documents", href: "/dashboard/documents" },
  { key: "planning", label: "Hazards, risk & operational controls", href: "/dashboard/planning" },
  { key: "program_iso", label: "Program register (MOC, drills, CB audits)", href: "/dashboard/program" },
] as const;

export default function DashboardHomePage() {
  const { organizationId } = useOrg();
  const utils = trpc.useUtils();

  const { data: completedSteps } = trpc.organization.setupSteps.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );
  const completeStep = trpc.organization.completeSetupStep.useMutation({
    onSuccess: () => void utils.organization.setupSteps.invalidate(),
  });

  const doneKeys = new Set((completedSteps ?? []).map((s) => s.stepKey));

  const { data: snapshot } = trpc.analytics.safetyDashboard.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const openIncidents = snapshot?.incidents?.openCount;
  const overdueCapaCount = snapshot?.capas?.overdueCount ?? 0;
  const aspectsCount = snapshot?.environment?.aspectCount;
  const obligationsCount = snapshot?.environment?.obligationCount;

  if (!organizationId) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
        <p className="font-medium text-zinc-800">Select an organization</p>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Overview</h1>
          <p className="text-base text-zinc-700">
            ISO 45001 &amp; 14001 operational snapshot
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Open incidents"
          value={openIncidents ?? OPEN_INCIDENTS_FALLBACK}
          href="/dashboard/incidents"
        />
        <MetricCard
          title="Overdue CAPAs"
          value={snapshot?.capas ? overdueCapaCount : "—"}
          href="/dashboard/capa"
          emphasize={overdueCapaCount > 0}
        />
        <MetricCard
          title="Environmental aspects"
          value={aspectsCount ?? "—"}
          href="/dashboard/environment"
        />
        <MetricCard
          title="Compliance obligations"
          value={obligationsCount ?? "—"}
          href="/dashboard/environment"
        />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-medium text-zinc-800">Setup checklist</h2>
        <p className="mt-1 text-sm text-zinc-700">
          Track ISO rollout steps for your org. Mark items when stakeholders agree they are in place.
        </p>
        <ul className="mt-3 divide-y divide-zinc-100 text-sm">
          {ONBOARDING_STEPS.map((step) => {
            const done = doneKeys.has(step.key);
            return (
              <li key={step.key} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      done ? "bg-emerald-600 text-white" : "border border-zinc-300 text-zinc-400"
                    }`}
                    aria-hidden
                  >
                    {done ? "✓" : ""}
                  </span>
                  <Link
                    href={step.href}
                    className="min-h-11 touch-target rounded-md text-base font-medium text-emerald-900 underline-offset-2 hover:underline hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 sm:text-sm"
                  >
                    {step.label}
                  </Link>
                </div>
                {!done ? (
                  <button
                    type="button"
                    className="touch-target rounded-md border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-50"
                    disabled={completeStep.isPending}
                    onClick={() =>
                      completeStep.mutate({
                        organizationId,
                        stepKey: step.key,
                      })
                    }
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

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-medium text-zinc-800">Quick actions</h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-base sm:text-sm">
          <li>
            <Link
              href="/dashboard/analytics"
              className="inline-flex min-h-11 touch-target items-center rounded-md bg-emerald-800 px-4 py-2 font-semibold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              Safety metrics
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/incidents/new"
              className="inline-flex min-h-11 touch-target items-center rounded-md border-2 border-emerald-800 bg-white px-4 py-2 font-semibold text-emerald-900 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              Report incident
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/incidents"
              className="inline-flex min-h-11 touch-target items-center rounded-md border border-zinc-400 bg-white px-4 py-2 font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              View incidents
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/capa"
              className="inline-flex min-h-11 touch-target items-center rounded-md border border-zinc-400 bg-white px-4 py-2 font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              CAPA register
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/documents"
              className="inline-flex min-h-11 touch-target items-center rounded-md border border-zinc-400 bg-white px-4 py-2 font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              Documents
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/planning"
              className="inline-flex min-h-11 touch-target items-center rounded-md border border-zinc-400 bg-white px-4 py-2 font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              Planning
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/audits"
              className="inline-flex min-h-11 touch-target items-center rounded-md border border-zinc-400 bg-white px-4 py-2 font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              Audits
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/tasks"
              className="inline-flex min-h-11 touch-target items-center rounded-md border border-zinc-400 bg-white px-4 py-2 font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              Tasks
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/import"
              className="inline-flex min-h-11 touch-target items-center rounded-md border border-zinc-400 bg-white px-4 py-2 font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              CSV import
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  href,
  emphasize,
}: {
  title: string;
  value: number | string;
  href: string;
  emphasize?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block min-h-[5.5rem] rounded-lg border bg-white p-4 shadow-sm hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
        emphasize ? "border-amber-400 ring-1 ring-amber-200" : " border-zinc-200"
      }`}
    >
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{value}</p>
    </Link>
  );
}
