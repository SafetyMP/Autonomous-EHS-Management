"use client";

import Link from "next/link";
import { filterHighlightsForUser, type ProductHighlight } from "@/lib/dashboard/productHighlights";

const cardLinkClass =
  "group block h-full rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

function ProgramUpdateCard({ item }: { item: ProductHighlight }) {
  return (
    <Link href={item.href} className={cardLinkClass}>
      <p className="text-sm font-semibold text-emerald-950 group-hover:text-emerald-900">{item.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-700">{item.description}</p>
    </Link>
  );
}

export type DashboardProgramUpdatesProps = {
  isAdmin: boolean;
  canIntegrationRead: boolean;
  persona: "desk_contributor" | "desk_supervisor";
};

export function DashboardProgramUpdates({
  isAdmin,
  canIntegrationRead,
  persona,
}: DashboardProgramUpdatesProps) {
  const highlights = filterHighlightsForUser({
    isAdmin,
    canIntegrationRead,
    persona,
  }).filter((h) => h.id !== "lifecycle-nav");

  if (highlights.length === 0) return null;

  return (
    <section aria-labelledby="program-updates-heading" className="space-y-3">
      <div>
        <h2 id="program-updates-heading" className="text-base font-semibold text-zinc-900">
          Program updates
        </h2>
        <p className="text-sm text-zinc-700">
          New hubs and tools aligned with the lifecycle navigation in the sidebar.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {highlights.map((item) => (
          <ProgramUpdateCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
