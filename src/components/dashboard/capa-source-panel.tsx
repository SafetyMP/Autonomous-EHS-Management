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
  const idx = CAPA_STATUSES.indexOf(status as (typeof CAPA_STATUSES)[number]);
  return (
    <ol className="flex flex-wrap gap-2" aria-label="CAPA workflow status">
      {CAPA_STATUSES.map((s, i) => {
        const active = i === idx;
        const done = idx >= 0 && i < idx;
        return (
          <li
            key={s}
            className={`min-h-9 rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${
              active
                ? "border-2 border-emerald-700 bg-emerald-50 text-emerald-950"
                : done
                  ? "border border-emerald-200 bg-emerald-50/50 text-emerald-900"
                  : "border border-zinc-200 bg-zinc-50 text-zinc-600"
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
}: {
  sources: CapaGet["sources"];
  hasOpenApproval: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className={dfSectionHeading}>Source &amp; context</h2>
      <p className={`mt-1 ${dfHelperXs}`}>
        Upstream records that drove this corrective action (schema-linked sources).
      </p>
      {sources.length === 0 ? (
        <p className={`mt-3 text-base ${dfMuted}`}>Standalone CAPA — no linked source record.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-base">
          {sources.map((s) => (
            <li key={`${s.kind}-${s.id}`}>
              <span className="font-semibold capitalize text-zinc-900">
                {s.kind.replaceAll("_", " ")}:{" "}
              </span>
              <Link href={s.href} className={dfInlineNavLink}>
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
    </div>
  );
}
