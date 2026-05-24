"use client";

import { dfHelperXs, dfMuted } from "@/lib/dashboard-field-styles";

/** In-app guidance for PortCo pilot proof capture (pairs with repo docs + KPI CSV export). */
export function PortCoPilotProofPanel() {
  return (
    <section
      className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
      aria-label="PortCo pilot proof"
    >
      <h2 className="text-base font-semibold text-zinc-900">PortCo pilot proof</h2>
      <p className={`mt-1 text-sm ${dfMuted}`}>
        Export the KPI CSV above for ROI tracking. Complete business UAT using{" "}
        <code className="text-xs">docs/qa/portco-uat-signoff-record.md</code> and record metrics in{" "}
        <code className="text-xs">docs/case-studies/portco-pilot-metrics-worksheet.md</code> after
        the 90-day pilot window.
      </p>
      <p className={`mt-2 text-sm ${dfMuted}`}>
        Integration failures: triage on{" "}
        <a href="/dashboard/integrations#integration-failed" className="text-emerald-900 underline">
          Integrations → Failed events
        </a>
        . Wire Slack/Teams via operational webhooks on the same page.
      </p>
      <ul className={`mt-2 list-disc space-y-1 pl-5 ${dfHelperXs}`}>
        <li>Tier 1 scope: incidents → CAPA → contractors → HRIS identity</li>
        <li>Parallel reporting vs legacy until program sign-off</li>
      </ul>
    </section>
  );
}
