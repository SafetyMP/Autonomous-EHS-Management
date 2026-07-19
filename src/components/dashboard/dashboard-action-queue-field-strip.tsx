"use client";

import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import { filterFieldPendingItems } from "@/lib/tasks/actionQueue";
import type { AppRouter } from "@/server/trpc/root";

type ActionQueueOut = inferRouterOutputs<AppRouter>["tasks"]["actionQueue"];

/**
 * Field pending strip — navigational rows only (no filled primary CTAs).
 * AC-004 action-region primaries live on Today hero / Capture create / Decide decide.
 */
export function DashboardActionQueueFieldStrip({
  queue,
  loading,
}: {
  queue: ActionQueueOut | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <section aria-labelledby="field-pending-heading" className="rounded-xl border border-border bg-surface p-4">
        <h2 id="field-pending-heading" className="text-lg font-semibold text-foreground">
          Pending for you
        </h2>
        <p role="status" aria-live="polite" className="mt-2 text-base text-text-muted">
          Loading…
        </p>
      </section>
    );
  }

  const pending = queue?.items ? filterFieldPendingItems(queue.items).slice(0, 3) : [];

  if (pending.length === 0) return null;

  return (
    <section
      aria-labelledby="field-pending-heading"
      className="rounded-xl border border-warning bg-warning-surface/80 p-4"
    >
      <h2 id="field-pending-heading" className="text-lg font-semibold text-foreground">
        Pending for you
      </h2>
      <ul className="mt-3 space-y-2" role="list">
        {pending.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex min-h-11 touch-target items-center justify-between gap-2 rounded-lg border border-border-strong bg-surface px-4 py-3 text-base font-medium text-foreground hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <span className="line-clamp-2">{item.title}</span>
              <span className="shrink-0 text-sm font-semibold text-primary">{item.ctaLabel} →</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-sm">
        <Link
          href="/dashboard/approvals"
          className="font-medium text-primary underline underline-offset-2"
        >
          Open approvals inbox
        </Link>
      </p>
    </section>
  );
}
