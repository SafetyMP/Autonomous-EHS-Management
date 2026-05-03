"use client";

import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { dfMuted, dfPrimarySubmit, dfSectionHeading } from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

export default function WorkflowCatalogPage() {
  const { organizationId } = useOrg();
  const org = organizationId!;

  const catalogQuery = trpc.compliance.workflowCatalog.get.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Workflow catalog</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Encoded workflow catalog</h1>
          <p className={dfMuted}>
            Read-only snapshot of status transitions implemented in application code. This is not a
            tenant-configurable workflow engine.
          </p>
        </div>
        <OrgSwitcher />
      </div>

      {catalogQuery.isLoading ? (
        <p className={dfMuted}>Loading…</p>
      ) : catalogQuery.error ? (
        <p className="text-sm text-red-700" role="alert">
          {catalogQuery.error.message}
        </p>
      ) : catalogQuery.data ? (
        <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <p className={`text-sm ${dfMuted}`}>
            Generated {catalogQuery.data.generatedAt} · version {catalogQuery.data.version}
          </p>
          <button
            type="button"
            className={dfPrimarySubmit}
            onClick={() => {
              const blob = new Blob([JSON.stringify(catalogQuery.data, null, 2)], {
                type: "application/json",
              });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `workflow-catalog-${org}.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            Download JSON
          </button>
          <div className="space-y-6">
            {catalogQuery.data.entities.map((e) => (
              <section key={e.entity} className="border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0">
                <h2 className={dfSectionHeading}>{e.label}</h2>
                {e.notes ? <p className={`mt-1 text-sm ${dfMuted}`}>{e.notes}</p> : null}
                <ul className="mt-2 list-inside list-disc text-sm text-zinc-800">
                  {e.transitions.map((t, ti) => (
                    <li key={`${e.entity}-${ti}-${t.from}-${t.to}`}>
                      <code className="rounded bg-zinc-100 px-1">{t.from}</code>
                      {" → "}
                      <code className="rounded bg-zinc-100 px-1">{t.to}</code>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
