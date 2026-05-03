"use client";

import Link from "next/link";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { dfInlineNavLink, dfMuted, dfPanelMinor } from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

export default function TasksPage() {
  const { organizationId } = useOrg();

  const { data, isLoading } = trpc.tasks.myOpenItems.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">My open tasks</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Task hub</h1>
          <p className={dfMuted}>
            Open CAPAs assigned to you, overdue obligation reviews, and expiring training
          </p>
        </div>
        <OrgSwitcher />
      </div>

      {isLoading ? (
        <p className="text-base text-zinc-700" role="status" aria-live="polite">
          Loading your tasks…
        </p>
      ) : !data ? (
        <p className="text-base text-zinc-700">No data.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <section className="rounded-lg border border-zinc-200 bg-white p-4" aria-labelledby="tasks-capas">
            <h2 id="tasks-capas" className={dfPanelMinor}>
              My CAPAs
            </h2>
            <ul className="mt-3 divide-y divide-zinc-100 text-base">
              {data.capas.length === 0 ? (
                <li className="py-3 text-zinc-700">None open.</li>
              ) : (
                data.capas.map((c) => (
                  <li key={c.id} className="py-3">
                    <Link href="/dashboard/capa" className={dfInlineNavLink}>
                      {c.title}
                    </Link>
                    <p className="mt-1 text-sm text-zinc-700">
                      {c.status}
                      {c.dueDate ? ` · due ${c.dueDate.toLocaleDateString()}` : ""}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>
          <section
            className="rounded-lg border border-zinc-200 bg-white p-4"
            aria-labelledby="tasks-obligations"
          >
            <h2 id="tasks-obligations" className={dfPanelMinor}>
              Overdue / due obligation reviews
            </h2>
            <ul className="mt-3 divide-y divide-zinc-100 text-base">
              {data.overdueObligations.length === 0 ? (
                <li className="py-3 text-zinc-700">None in this window.</li>
              ) : (
                data.overdueObligations.map((o) => (
                  <li key={o.id} className="py-3">
                    <Link href="/dashboard/environment" className={dfInlineNavLink}>
                      {o.title}
                    </Link>
                    {o.due ? (
                      <p className="mt-1 text-sm font-medium text-amber-900">
                        Due {o.due.toLocaleDateString()}
                      </p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </section>
          <section className="rounded-lg border border-zinc-200 bg-white p-4" aria-labelledby="tasks-training">
            <h2 id="tasks-training" className={dfPanelMinor}>
              Training expiring (30d)
            </h2>
            <ul className="mt-3 divide-y divide-zinc-100 text-base">
              {data.upcomingTraining.length === 0 ? (
                <li className="py-3 text-zinc-700">None.</li>
              ) : (
                data.upcomingTraining.map((t) => (
                  <li key={t.id} className="py-3">
                    <Link href="/dashboard/training" className={dfInlineNavLink}>
                      {t.courseTitle}
                    </Link>
                    {t.expiresOn ? (
                      <p className="mt-1 text-sm text-zinc-700">
                        Expires {t.expiresOn.toLocaleDateString()}
                      </p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </section>
          <section
            className="rounded-lg border border-zinc-200 bg-white p-4"
            aria-labelledby="tasks-mr"
          >
            <h2 id="tasks-mr" className={dfPanelMinor}>
              Management reviews due
            </h2>
            <ul className="mt-3 divide-y divide-zinc-100 text-base">
              {data.overdueManagementReviews.length === 0 ? (
                <li className="py-3 text-zinc-700">None overdue.</li>
              ) : (
                data.overdueManagementReviews.map((m) => (
                  <li key={m.id} className="py-3">
                    <Link href="/dashboard/management-review" className={dfInlineNavLink}>
                      {m.summary ?? "Management review"}
                    </Link>
                    {m.due ? (
                      <p className="mt-1 text-sm font-medium text-amber-900">
                        Due {m.due.toLocaleDateString()}
                      </p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
