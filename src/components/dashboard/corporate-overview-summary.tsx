import type { CommandCenterOut } from "@/lib/dashboard/commandCenterSignals";

/** Summary uses only the existing permission-scoped snapshot; missing data is never zero. */
export function CorporateOverviewSummary({ snapshot }: { snapshot: CommandCenterOut | undefined }) {
  const metrics = [
    { label: "Open incidents", value: snapshot?.kpis.incidents?.openCount, detail: "Awaiting closure", urgent: false },
    { label: "Overdue corrective actions", value: snapshot?.kpis.capas?.overdueCount, detail: "Past their due date", urgent: true },
    { label: "Open audit findings", value: snapshot?.kpis.auditFindings?.openNonConformanceCount, detail: "Nonconformances to resolve", urgent: false },
    { label: "Your pending approvals", value: snapshot?.kpis.approvalsInbox?.myPendingStepsCount, detail: "Decisions assigned to you", urgent: false },
  ];

  return (
    <section aria-label="Organization at a glance" data-section="corporate-summary">
      <dl className="grid grid-cols-2 divide-x divide-border overflow-hidden rounded-xl border border-border bg-surface lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="border-b border-border p-4 last:border-b-0 lg:border-b-0 sm:p-5">
            <dt className="text-sm font-medium text-text-muted">{metric.label}</dt>
            <dd className={`mt-2 text-3xl font-semibold tabular-nums ${metric.urgent && (metric.value ?? 0) > 0 ? "text-warning" : "text-foreground"}`}>
              {metric.value ?? "—"}
            </dd>
            <dd className="mt-1 text-xs text-text-subtle">
              {metric.value == null ? "Not available in this view" : metric.detail}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
