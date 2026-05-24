"use client";

import Link from "next/link";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { dfHelperXs, dfInlineNavLink, dfMuted } from "@/lib/dashboard-field-styles";
import type { ActionQueueItem } from "@/lib/tasks/actionQueue";
import { trpc } from "@/trpc/react";

function typeLabel(type: ActionQueueItem["type"]): string {
  switch (type) {
    case "approval_step":
      return "Approval";
    case "capa":
      return "CAPA";
    case "training":
      return "Training";
    case "obligation_review":
      return "Obligation review";
    case "management_review":
      return "Management review";
    default:
      return "Task";
  }
}

export default function TasksPage() {
  const { organizationId } = useOrg();

  const { data: queue, isLoading } = trpc.tasks.actionQueue.useQuery(
    { organizationId: organizationId!, limit: 50, includeOrgWide: true },
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
            Ranked list of approvals, CAPAs, training renewals, and compliance reviews assigned to
            you or visible with your permissions.
          </p>
        </div>
        <OrgSwitcher />
      </div>

      {isLoading ? (
        <p className="text-base text-zinc-700" role="status" aria-live="polite">
          Loading your tasks…
        </p>
      ) : !queue || queue.items.length === 0 ? (
        <p className="text-base text-zinc-700">You&apos;re caught up on assigned work.</p>
      ) : (
        <section aria-labelledby="tasks-ranked-list">
          <h2 id="tasks-ranked-list" className="text-lg font-semibold text-zinc-900">
            All items ({queue.totalCount})
          </h2>
          <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
            {queue.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-500">{typeLabel(item.type)}</p>
                  <Link href={item.href} className={`${dfInlineNavLink} text-base`}>
                    {item.title}
                  </Link>
                  <p className={`mt-1 ${dfHelperXs}`}>
                    {item.reason}
                    {item.dueAt ? (
                      <>
                        {" "}
                        · due{" "}
                        <time dateTime={item.dueAt}>
                          {new Date(item.dueAt).toLocaleDateString()}
                        </time>
                      </>
                    ) : null}
                    {item.isOverdue ? (
                      <span className="ml-1 font-semibold text-amber-900"> · overdue</span>
                    ) : null}
                  </p>
                </div>
                <Link
                  href={item.href}
                  className="touch-target shrink-0 rounded-md border border-emerald-800 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-100"
                >
                  {item.ctaLabel}
                </Link>
              </li>
            ))}
          </ul>
          {queue.totalCount > queue.items.length ? (
            <p className={`mt-2 ${dfHelperXs}`}>
              Showing top {queue.items.length} of {queue.totalCount} items by priority.
            </p>
          ) : null}
        </section>
      )}

      <p className={dfHelperXs}>
        Need program-wide reviews? See{" "}
        <Link href="/dashboard/approvals" className={dfInlineNavLink}>
          Approvals
        </Link>{" "}
        and{" "}
        <Link href="/dashboard" className={dfInlineNavLink}>
          Command center
        </Link>{" "}
        for org-level alerts.
      </p>
    </div>
  );
}
