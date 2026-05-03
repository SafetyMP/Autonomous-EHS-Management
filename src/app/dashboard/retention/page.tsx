"use client";

import { useState } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  DATA_RETENTION_ACTIONS,
  DATA_RETENTION_RECORD_CLASSES,
  RETENTION_DATE_ANCHORS,
} from "@/lib/ehs-enums";
import {
  dfControl,
  dfHelperXs,
  dfLabel,
  dfMuted,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

export default function DataRetentionPage() {
  const { organizationId } = useOrg();
  const org = organizationId!;

  const listQuery = trpc.compliance.dataRetention.listPolicies.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );
  const exportMutation = trpc.compliance.regulatoryOsha.exportInjuryIllnessSnapshot.useMutation();
  const agencyPlaceholder = trpc.compliance.regulatoryOsha.agencyExportPlaceholder.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );

  const [jurisdiction, setJurisdiction] = useState("default");
  const [recordClass, setRecordClass] =
    useState<(typeof DATA_RETENTION_RECORD_CLASSES)[number]>("incident_general");
  const [minimumYears, setMinimumYears] = useState(7);
  const [action, setAction] = useState<(typeof DATA_RETENTION_ACTIONS)[number]>("anonymize");
  const [anchor, setAnchor] =
    useState<(typeof RETENTION_DATE_ANCHORS)[number]>("rolling_from_event");

  const upsert = trpc.compliance.dataRetention.upsertPolicy.useMutation({
    onSuccess: () => void listQuery.refetch(),
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Data retention</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Data retention & exports</h1>
          <p className={dfMuted}>
            Org retention matrix (counsel-defined meanings). Incident legal hold is set per incident on
            the incident detail screen.
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className={dfSectionHeading}>Retention policies</h2>
        {listQuery.isLoading ? (
          <p className={dfMuted}>Loading…</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {(listQuery.data ?? []).length === 0 ? (
              <li className={dfMuted}>No policies yet. Add one below.</li>
            ) : (
              listQuery.data!.map((p) => (
                <li key={p.id} className="py-2 text-sm">
                  <span className="font-medium">{p.jurisdiction}</span> · {p.recordClass} ·{" "}
                  {p.minimumYears}y · {p.action} · {p.retentionDateAnchor}
                </li>
              ))
            )}
          </ul>
        )}

        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            upsert.mutate({
              organizationId,
              jurisdiction,
              recordClass,
              minimumYears,
              action,
              retentionDateAnchor: anchor,
            });
          }}
        >
          <p className={dfHelperXs}>
            Jurisdiction label is free-form (e.g. US-Federal, EU-GDPR region code). Align with
            counsel.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={dfControl}>
              <label className={dfLabel} htmlFor="ret-jurisdiction">
                Jurisdiction
              </label>
              <input
                id="ret-jurisdiction"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                maxLength={64}
                required
              />
            </div>
            <div className={dfControl}>
              <label className={dfLabel} htmlFor="ret-class">
                Record class
              </label>
              <select
                id="ret-class"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base"
                value={recordClass}
                onChange={(e) =>
                  setRecordClass(e.target.value as (typeof DATA_RETENTION_RECORD_CLASSES)[number])
                }
              >
                {DATA_RETENTION_RECORD_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className={dfControl}>
              <label className={dfLabel} htmlFor="ret-years">
                Minimum years
              </label>
              <input
                id="ret-years"
                type="number"
                min={0}
                max={200}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base"
                value={minimumYears}
                onChange={(e) => setMinimumYears(Number(e.target.value))}
                required
              />
            </div>
            <div className={dfControl}>
              <label className={dfLabel} htmlFor="ret-action">
                Action after retention
              </label>
              <select
                id="ret-action"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base"
                value={action}
                onChange={(e) =>
                  setAction(e.target.value as (typeof DATA_RETENTION_ACTIONS)[number])
                }
              >
                {DATA_RETENTION_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className={dfControl}>
              <label className={dfLabel} htmlFor="ret-anchor">
                Date anchor
              </label>
              <select
                id="ret-anchor"
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base"
                value={anchor}
                onChange={(e) =>
                  setAnchor(e.target.value as (typeof RETENTION_DATE_ANCHORS)[number])
                }
              >
                {RETENTION_DATE_ANCHORS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className={dfPrimarySubmit} disabled={upsert.isPending}>
            {upsert.isPending ? "Saving…" : "Save policy"}
          </button>
          {upsert.error ? (
            <p className="text-sm text-red-700" role="alert">
              {upsert.error.message}
            </p>
          ) : null}
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className={dfSectionHeading}>OSHA injury/illness snapshot (JSON)</h2>
        <p className={dfMuted}>
          Exports structured sidecar fields linked to incidents. Omits ciphertext and detailed PHI;
          not a substitute for legal review or agency formatting.
        </p>
        <button
          type="button"
          className={`${dfSecondaryOutline} mt-3`}
          disabled={exportMutation.isPending}
          onClick={() => {
            exportMutation.mutate(
              { organizationId },
              {
                onSuccess: (data) => {
                  const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                  });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `osha-injury-illness-snapshot-${org}.json`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                },
              },
            );
          }}
        >
          {exportMutation.isPending ? "Exporting…" : "Download JSON snapshot"}
        </button>
        {exportMutation.error ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {exportMutation.error.message}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
        <h2 className={dfSectionHeading}>Agency-formatted OSHA export (scaffold)</h2>
        <p className={dfMuted}>
          Separate from the JSON snapshot above. Filing-ready CSV/XML has{" "}
          <strong className="font-medium">not</strong> been implemented.
        </p>
        {agencyPlaceholder.isLoading ? (
          <p className={dfMuted}>Loading…</p>
        ) : agencyPlaceholder.data ? (
          <div className="mt-3 space-y-2 text-sm text-amber-950">
            <p>{agencyPlaceholder.data.disclaimer}</p>
            <p className="font-medium">Future reference columns (for engineering / counsel review):</p>
            <ul className="list-inside list-disc text-amber-900">
              {agencyPlaceholder.data.referenceColumns.map((c) => (
                <li key={c}>
                  <code className="rounded bg-amber-100/80 px-1">{c}</code>
                </li>
              ))}
            </ul>
          </div>
        ) : agencyPlaceholder.error ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {agencyPlaceholder.error.message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
