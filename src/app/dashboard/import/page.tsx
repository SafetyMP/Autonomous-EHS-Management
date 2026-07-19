"use client";

import { useState } from "react";
import { ModuleMaturityBanner } from "@/components/dashboard/module-maturity-banner";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfHelperXs,
  dfMonoBlock,
  dfMuted,
  dfPanelHeading,
  dfPrimarySubmit,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

export default function ImportPage() {
  const { organizationId } = useOrg();
  const [aspectCsv, setAspectCsv] = useState("");
  const [hazardCsv, setHazardCsv] = useState("");
  const utils = trpc.useUtils();

  const importAspects = trpc.importData.importAspectsCsv.useMutation({
    onSuccess: () => {
      void utils.aspect.list.invalidate();
      setAspectCsv("");
    },
  });
  const importHazards = trpc.importData.importHazardsCsv.useMutation({
    onSuccess: () => {
      void utils.planning.hazard.list.invalidate();
      setHazardCsv("");
    },
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">CSV import</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Import CSV</h1>
          <p className={dfMuted}>
            Batch aspects and hazards with server validation and audit logging
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <ModuleMaturityBanner tier="plumbing">
        Plumbing maturity — bulk CSV import scaffolds with audit logging. Not a Core intake path.
        See docs/module-maturity.md.
      </ModuleMaturityBanner>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6" aria-labelledby="import-aspects-h2">
        <h2 id="import-aspects-h2" className={dfPanelHeading}>
          Environmental aspects
        </h2>
        <p className={`${dfHelperXs} mt-2`}>
          Header row required. Columns: <code className="rounded bg-zinc-100 px-1.5 py-0.5">name</code>{" "}
          (required), <code className="rounded bg-zinc-100 px-1.5 py-0.5">activity</code>,{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5">description</code>.
        </p>
        <textarea
          rows={8}
          className={dfMonoBlock}
          placeholder={'name,activity,description\nStormwater sampling,Monitoring,"Quarterly outfall tests"'}
          value={aspectCsv}
          onChange={(e) => setAspectCsv(e.target.value)}
          aria-label="Environmental aspects CSV"
        />
        <button
          type="button"
          disabled={importAspects.isPending || !aspectCsv.trim()}
          aria-busy={importAspects.isPending}
          onClick={() => importAspects.mutate({ organizationId, csvText: aspectCsv })}
          className={`${dfPrimarySubmit} mt-3`}
        >
          Import aspects
        </button>
        {importAspects.data ? (
          <p className="mt-3 text-base text-zinc-800" role="status" aria-live="polite">
            Imported {importAspects.data.imported} row(s).
            {importAspects.data.errors?.length
              ? ` Errors: ${importAspects.data.errors.join("; ")}`
              : ""}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-6" aria-labelledby="import-hazards-h2">
        <h2 id="import-hazards-h2" className={dfPanelHeading}>
          Hazards
        </h2>
        <p className={`${dfHelperXs} mt-2`}>
          Columns: <code className="rounded bg-zinc-100 px-1.5 py-0.5">title</code> (required),{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5">description</code>.
        </p>
        <textarea
          rows={8}
          className={dfMonoBlock}
          placeholder={'title,description\nForklift traffic,"Blind corners near loading bay"'}
          value={hazardCsv}
          onChange={(e) => setHazardCsv(e.target.value)}
          aria-label="Hazards CSV"
        />
        <button
          type="button"
          disabled={importHazards.isPending || !hazardCsv.trim()}
          aria-busy={importHazards.isPending}
          onClick={() => importHazards.mutate({ organizationId, csvText: hazardCsv })}
          className={`${dfPrimarySubmit} mt-3`}
        >
          Import hazards
        </button>
        {importHazards.data ? (
          <p className="mt-3 text-base text-zinc-800" role="status" aria-live="polite">
            Imported {importHazards.data.imported} row(s).
            {importHazards.data.errors?.length
              ? ` Errors: ${importHazards.data.errors.join("; ")}`
              : ""}
          </p>
        ) : null}
      </section>
    </div>
  );
}
