"use client";

import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/root";

type ActionQueueOut = inferRouterOutputs<AppRouter>["tasks"]["actionQueue"];

function formatDueLabel(dueAt: string | null, isOverdue: boolean): string {
  if (!dueAt) return "";
  const due = new Date(dueAt);
  const dateStr = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (isOverdue) return `Overdue · ${dateStr}`;
  return `Due ${dateStr}`;
}

function PrimaryCard({ item }: { item: NonNullable<ActionQueueOut["primary"]> }) {
  const dueLabel = formatDueLabel(item.dueAt, item.isOverdue);
  return (
    <div
      className={`rounded-xl border-2 bg-white p-4 shadow-sm ${
        item.isOverdue ? "border-amber-400 bg-amber-50/50" : "border-emerald-200"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{item.reason}</p>
      <p className="mt-1 text-lg font-semibold text-zinc-900">{item.title}</p>
      {dueLabel ? (
        <p className="mt-1 text-sm text-zinc-700" aria-live="polite">
          {dueLabel}
        </p>
      ) : null}
      <div className="mt-4">
        <Link
          href={item.href}
          className="inline-flex min-h-11 touch-target items-center justify-center rounded-lg bg-emerald-800 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          {item.ctaLabel} →
        </Link>
      </div>
    </div>
  );
}

export function DashboardActionQueueHero({
  queue,
  loading,
}: {
  queue: ActionQueueOut | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <section
        aria-labelledby="your-work-heading"
        className="rounded-xl border border-zinc-200 bg-white p-6"
      >
        <h2 id="your-work-heading" className="text-lg font-semibold text-zinc-900">
          Your work
        </h2>
        <p role="status" aria-live="polite" className="mt-3 text-base text-zinc-600">
          Loading your next actions…
        </p>
      </section>
    );
  }

  const primary = queue?.primary;
  const secondary = queue?.items.slice(1) ?? [];
  const total = queue?.totalCount ?? 0;

  return (
    <section
      aria-labelledby="your-work-heading"
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="your-work-heading" className="text-lg font-semibold text-zinc-900">
          Your work
        </h2>
        {total > 0 ? (
          <Link
            href="/dashboard/tasks"
            className="text-sm font-medium text-emerald-900 underline underline-offset-2 hover:text-emerald-950"
          >
            View all tasks
          </Link>
        ) : null}
      </div>

      {!primary ? (
        <p className="mt-3 text-base text-zinc-700">
          You&apos;re caught up on assigned work. Open{" "}
          <Link href="/dashboard/tasks" className="font-medium text-emerald-900 underline underline-offset-2">
            Tasks &amp; reviews
          </Link>{" "}
          for org-wide obligations and management reviews.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-800">Your next action</p>
            <PrimaryCard item={primary} />
          </div>

          {secondary.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-700">
                {total > 1 ? `${total - 1} more item${total - 1 === 1 ? "" : "s"}` : null}
              </p>
              <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200" role="list">
                {secondary.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex min-h-11 touch-target flex-col gap-0.5 px-3 py-3 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-base font-medium text-zinc-900">{item.title}</span>
                      <span className="text-sm text-zinc-600">
                        {formatDueLabel(item.dueAt, item.isOverdue) || item.reason}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
