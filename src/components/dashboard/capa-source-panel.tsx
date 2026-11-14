"use client";

import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import { dfHelperXs, dfInlineNavLink, dfMuted, dfSectionHeading } from "@/lib/dashboard-field-styles";
import type { AppRouter } from "@/server/trpc/root";

type CapaGet = inferRouterOutputs<AppRouter>["capa"]["get"];

const CAPA_STATUSES = [
  "pending_approval",
  "planned",
  "in_progress",
  "completed",
  "verified",
] as const;

export function CapaStatusStepper({ status }: { status: string }) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label="CAPA workflow status">
      {CAPA_STATUSES.map((s) => {
        const active = s === status;
        return (
          <li
            key={s}
            className={`min-h-9 rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${
              active
                ? "border-2 border-emerald-700 bg-emerald-50 text-emerald-950"
                : "border border-border bg-surface text-text-muted"
            }`}
            aria-current={active ? "step" : undefined}
          >
            {s.replaceAll("_", " ")}
          </li>
        );
      })}
    </ol>
  );
}

export function CapaSourcePanel({
  sources,
  hasOpenApproval,
  incidentFilter = "",
}: {
  sources: CapaGet["sources"];
  hasOpenApproval: boolean;
  incidentFilter?: string;
}) {
  return (
    <section id="action-source" aria-labelledby="action-source-heading" className="scroll-mt-44 sm:scroll-mt-24 rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 id="action-source-heading" className={dfSectionHeading}>Source &amp; context</h2>
      <p className={`mt-1 ${dfHelperXs}`}>
        Return to the incident or finding that prompted this action. Its record and this action keep their own status.
      </p>
      {sources.length === 0 ? (
        <p className={`mt-3 text-base ${dfMuted}`}>Standalone CAPA — no linked source record.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-base">
          {sources.map((s) => (
            <li key={`${s.kind}-${s.id}`} className="rounded-lg border border-border px-4 py-3">
              <span className="font-semibold capitalize text-zinc-900">
                {s.kind.replaceAll("_", " ")}:{" "}
              </span>
              <Link
                href={s.kind === "incident" && incidentFilter
                  ? `/dashboard/incidents/${encodeURIComponent(s.id)}?${new URLSearchParams({ incidentFilter })}#corrective-actions`
                  : s.href}
                className={dfInlineNavLink}
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {hasOpenApproval ? (
        <p className="mt-4 text-sm text-amber-900">
          Plan approval pending —{" "}
          <Link href="/dashboard/approvals" className={dfInlineNavLink}>
            open approvals inbox
          </Link>
          .
        </p>
      ) : null}
    </section>
  );
}
