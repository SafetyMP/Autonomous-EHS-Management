"use client";

import Link from "next/link";
import {
  dfHelperXs,
  dfInlineNavLink,
  dfMuted,
  dfPanelHeading,
  dfSecondaryOutline,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

export function IntegrationsPlatformPanel({ organizationId }: { organizationId: string }) {
  const utils = trpc.useUtils();
  const orgs = trpc.organization.mine.useQuery();
  const org = orgs.data?.find((o) => o.id === organizationId);
  const cc = trpc.analytics.commandCenter.useQuery({ organizationId }, { enabled: !!organizationId });
  const events = trpc.integration.listEvents.useQuery({ organizationId }, { enabled: !!organizationId });

  const toggleContextSync = trpc.organization.updateContextSyncEnabled.useMutation({
    onSuccess: () => void utils.organization.mine.invalidate(),
  });

  const lmsEvents = (events.data ?? []).filter((e) => e.eventType === "training_completion").slice(0, 10);
  const hrisEvents = (events.data ?? []).filter((e) => e.eventType.includes("hris")).slice(0, 10);

  return (
    <div className="space-y-6">
      {org ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" aria-label="Context Sync">
          <h2 className={dfPanelHeading}>Context Sync (org admin)</h2>
          <p className={`mt-1 text-sm ${dfMuted}`}>
            Enables governed REST access for IDE agents. Does not replace GitHub/Vercel as deploy
            authority.
          </p>
          <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-medium text-zinc-900">
            <input
              type="checkbox"
              checked={org.contextSyncEnabled}
              onChange={(e) =>
                toggleContextSync.mutate({ organizationId, enabled: e.target.checked })
              }
              disabled={toggleContextSync.isPending}
            />
            Context Sync enabled for this organization
          </label>
          {toggleContextSync.error ? (
            <p className="mt-2 text-sm text-red-800" role="alert">
              {toggleContextSync.error.message}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" aria-label="LMS training events">
        <h2 className={dfPanelHeading}>LMS → training (reconcile manually)</h2>
        <p className={`mt-1 text-sm ${dfMuted}`}>
          Inbound LMS completions are logged as integration events. Confirm each row against{" "}
          <Link href="/dashboard/training" className={dfInlineNavLink}>
            Training records
          </Link>{" "}
          until automated reconciliation ships.
        </p>
        <ul className="mt-3 divide-y divide-zinc-100 text-sm">
          {lmsEvents.length === 0 ? (
            <li className="py-2 text-zinc-600">No LMS completion events yet.</li>
          ) : (
            lmsEvents.map((ev) => (
              <li key={ev.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{ev.eventType}</span>
                <time className={dfHelperXs}>{new Date(ev.createdAt).toLocaleString()}</time>
                <Link href="/dashboard/training" className={dfSecondaryOutline}>
                  Reconcile in Training
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" aria-label="HRIS sync">
        <h2 className={dfPanelHeading}>HRIS membership sync</h2>
        <p className={`mt-1 text-sm ${dfMuted}`}>
          HRIS v2 sync updates site, department, manager, and employment status for org members. Pair with{" "}
          <strong>SCIM provisioning</strong> below for joiner/mover/leaver at scale.
        </p>
        <ul className="mt-3 divide-y divide-zinc-100 text-sm">
          {hrisEvents.length === 0 ? (
            <li className="py-2 text-zinc-600">No HRIS sync events yet.</li>
          ) : (
            hrisEvents.map((ev) => (
              <li key={ev.id} className="py-2">
                <span className="font-medium">{ev.eventType}</span>
                <span className={`ml-2 ${dfHelperXs}`}>{new Date(ev.createdAt).toLocaleString()}</span>
                <span className={`ml-2 ${dfHelperXs}`}>{ev.processingStatus}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      {cc.data?.kpis?.cronHealth && cc.data.kpis.cronHealth.jobs.length > 0 ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm" aria-label="Cron health">
          <h2 className={dfPanelHeading}>Scheduled job health</h2>
          <p className={`mt-1 text-sm ${dfMuted}`}>
            Moved from command center — org admins monitor cron completion here.
          </p>
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {cc.data.kpis.cronHealth.jobs.map((j) => (
              <li key={j.jobKey} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="font-mono text-xs">{j.jobKey}</span>
                <span>
                  {j.lastOk ? "OK" : "Failed"} · {new Date(j.lastStartedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
