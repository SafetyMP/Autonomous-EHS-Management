"use client";

import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/root";

type ActionQueueOut = inferRouterOutputs<AppRouter>["tasks"]["actionQueue"];

/** AC-CF-D001: ≤3 emphasized queue rows before “View all”. */
const MAX_EMPHASIZED_QUEUE_ROWS = 3;

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
      data-stress-action-region="today-queue-row"
      data-emphasized-queue-row
      className={`rounded-xl border-2 bg-surface p-4 shadow-sm ${
        item.isOverdue ? "border-warning bg-warning-surface/50" : "border-primary-soft-border/40"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">{item.reason}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{item.title}</p>
      {dueLabel ? (
        <p className="mt-1 text-sm text-text-muted" aria-live="polite">
          {dueLabel}
        </p>
      ) : null}
      <div className="mt-4">
        {/* AC-004 / AC-CF-D001: exactly one filled primary CTA in this action region */}
        <Link href={item.href} className="btn-primary touch-target">
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
        className="rounded-xl border border-border bg-surface p-6"
      >
        <h2 id="your-work-heading" className="text-lg font-semibold text-foreground">
          Your work
        </h2>
        <p role="status" aria-live="polite" className="mt-3 text-base text-text-muted">
          Loading your next actions…
        </p>
      </section>
    );
  }

  const primary = queue?.primary;
  const secondaryAll = queue?.items.slice(1) ?? [];
  const secondaryVisible = secondaryAll.slice(0, Math.max(0, MAX_EMPHASIZED_QUEUE_ROWS - 1));
  const emphasizedCount = (primary ? 1 : 0) + secondaryVisible.length;
  const total = queue?.totalCount ?? 0;
  const hasMoreBeyondCeiling = total > emphasizedCount;

  return (
    <section
      aria-labelledby="your-work-heading"
      data-section="action-queue"
      className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="your-work-heading" className="text-lg font-semibold text-foreground">
          Your work
        </h2>
        {total > 0 ? (
          <Link
            href="/dashboard/tasks"
            className="text-sm font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
          >
            View all tasks
          </Link>
        ) : null}
      </div>

      {!primary ? (
        <p className="mt-3 text-base text-text-muted">
          You&apos;re caught up on assigned work. Open{" "}
          <Link href="/dashboard/tasks" className="font-medium text-primary underline underline-offset-2">
            Tasks &amp; reviews
          </Link>{" "}
          for org-wide obligations and management reviews.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-foreground">Your next action</p>
            <PrimaryCard item={primary} />
          </div>

          {secondaryVisible.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-text-muted">
                {hasMoreBeyondCeiling
                  ? `${total - 1} more item${total - 1 === 1 ? "" : "s"}`
                  : secondaryVisible.length === 1
                    ? "1 more item"
                    : `${secondaryVisible.length} more items`}
              </p>
              <ul className="divide-y divide-border rounded-lg border border-border" role="list">
                {secondaryVisible.map((item) => (
                  <li key={item.id} data-emphasized-queue-row>
                    <Link
                      href={item.href}
                      className="flex min-h-11 touch-target flex-col gap-0.5 px-3 py-3 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-base font-medium text-foreground">{item.title}</span>
                      <span className="text-sm text-text-subtle">
                        {formatDueLabel(item.dueAt, item.isOverdue) || item.reason}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasMoreBeyondCeiling ? (
            <p className="text-sm text-text-muted">
              Showing {emphasizedCount} of {total}.{" "}
              <Link
                href="/dashboard/tasks"
                className="font-medium text-primary underline underline-offset-2"
              >
                View all
              </Link>
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
