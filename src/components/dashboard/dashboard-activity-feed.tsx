import Link from "next/link";

export type DashboardActivityItem = {
  kind: string;
  title: string;
  path: string;
  occurredAt: string;
  meta: string | null;
};

const KIND_LABELS: Record<string, string> = {
  incident: "Incident",
  corrective_action: "CAPA",
  work_permit: "Permit",
  observation: "Observation",
  inspection: "Inspection",
  audit_finding: "Audit finding",
  risk_assessment: "Risk assessment",
  environmental_regulatory_permit: "Environmental permit",
};

export function DashboardActivityFeed({ items }: { items: DashboardActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-base text-zinc-600">
        No recent activity visible with your permissions. Create or update records to see updates here.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-zinc-100" aria-label="Recent operational activity">
      {items.map((item, idx) => {
        const kindLabel = KIND_LABELS[item.kind] ?? item.kind;
        const when = new Date(item.occurredAt);
        const timeStr =
          Number.isNaN(when.getTime())
            ? "—"
            : when.toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              });
        return (
          <li key={`${item.kind}-${item.path}-${idx}`}>
            <Link
              href={item.path}
              className="block min-h-11 rounded-md px-3 py-3 hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 sm:py-2"
            >
              <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="min-w-0 text-base font-medium text-zinc-900 sm:text-sm">
                  <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    {kindLabel}
                  </span>
                  {item.title}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-zinc-500">{timeStr}</span>
              </span>
              {item.meta ? (
                <span className="mt-1 block text-sm capitalize text-zinc-600">{item.meta.replaceAll("_", " ")}</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
