"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AuditFindingCapaActions } from "@/components/dashboard/audit-finding-capa-actions";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfControl,
  dfHelperXs,
  dfLabel,
  dfMuted,
  dfPanelMinor,
  dfPrimarySubmit,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

const AUDIT_STATUS = ["planned", "in_progress", "completed"] as const;
const FINDING_TYPES = [
  "observation",
  "minor_nc",
  "major_nc",
  "opportunity",
] as const;

/** Status picker: segmented control styling with touch-friendly targets */
const statusPickActive =
  "min-h-11 rounded-md border-2 border-emerald-700 bg-emerald-50 px-3 py-2 text-xs font-semibold capitalize text-emerald-950 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";
const statusPickIdle =
  "min-h-11 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-medium capitalize text-zinc-800 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

export default function AuditsPage() {
  const { organizationId } = useOrg();
  const utils = trpc.useUtils();
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);

  const [aTitle, setATitle] = useState("");
  const [aScope, setAScope] = useState("");
  const [aPlanned, setAPlanned] = useState("");

  const [fType, setFType] = useState<(typeof FINDING_TYPES)[number]>("observation");
  const [fTitle, setFTitle] = useState("");
  const [fDetails, setFDetails] = useState("");

  const { data: audits, isLoading } = trpc.internalAudit.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );
  const { data: findings, isLoading: loadingFindings } =
    trpc.internalAudit.finding.list.useQuery(
      {
        organizationId: organizationId!,
        internalAuditId: selectedAuditId!,
      },
      { enabled: !!organizationId && !!selectedAuditId },
    );

  const { data: capas } = trpc.capa.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const capaTitleById = useMemo(
    () => new Map((capas ?? []).map((c) => [c.id, c.title])),
    [capas],
  );

  const createAudit = trpc.internalAudit.create.useMutation({
    onSuccess: (row) => {
      void utils.internalAudit.list.invalidate();
      setATitle("");
      setAScope("");
      setAPlanned("");
      setSelectedAuditId(row.id);
    },
  });
  const updateAudit = trpc.internalAudit.update.useMutation({
    onSuccess: () => void utils.internalAudit.list.invalidate(),
  });
  const createFinding = trpc.internalAudit.finding.create.useMutation({
    onSuccess: () => {
      void utils.internalAudit.finding.list.invalidate();
      setFTitle("");
      setFDetails("");
    },
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Internal audits</h1>
        <OrgSwitcher />
      </div>
    );
  }

  const selectedAudit = audits?.find((a) => a.id === selectedAuditId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Internal audits</h1>
          <p className={dfMuted}>
            ISO 45001 / 14001 — audit programme.{" "}
            <Link href="/dashboard/assurance" className="font-medium text-emerald-900 underline">
              Assurance hub
            </Link>{" "}
            includes CB audits and certificates.
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className={dfSectionHeading}>Plan audit</h2>
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createAudit.mutate({
              organizationId,
              title: aTitle,
              scope: aScope,
              plannedDate: aPlanned ? new Date(aPlanned) : undefined,
            });
          }}
        >
          <input
            required
            placeholder="Title"
            className={dfControl}
            value={aTitle}
            onChange={(e) => setATitle(e.target.value)}
          />
          <textarea
            required
            minLength={10}
            placeholder="Scope (min 10 chars)"
            rows={3}
            className={dfControl}
            value={aScope}
            onChange={(e) => setAScope(e.target.value)}
          />
          <div>
            <label className={dfLabel} htmlFor="audit-planned">
              Planned date (optional)
            </label>
            <input id="audit-planned" type="date" className={`mt-1 ${dfControl}`}
              value={aPlanned}
              onChange={(e) => setAPlanned(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={createAudit.isPending}
            aria-busy={createAudit.isPending}
            className={dfPrimarySubmit}
          >
            Create audit
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className={dfSectionHeading}>Audits</h2>
          <ul className="mt-2 divide-y rounded-lg border border-zinc-200 bg-white text-sm">
            {isLoading ? (
              <li className="px-4 py-3 text-base text-zinc-700" role="status" aria-live="polite">
                Loading…
              </li>
            ) : audits?.length === 0 ? (
              <li className="px-4 py-3 text-base text-zinc-700">None yet.</li>
            ) : (
              audits?.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    aria-pressed={selectedAuditId === a.id}
                    className={`flex min-h-[3rem] w-full flex-col px-4 py-3 text-left hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-inset ${
                      selectedAuditId === a.id ? "bg-emerald-50" : ""
                    }`}
                    onClick={() => setSelectedAuditId(a.id)}
                  >
                    <span className="font-medium text-zinc-900">{a.title}</span>
                    <span className={`mt-1 capitalize ${dfHelperXs}`}>
                      {a.status.replace("_", " ")}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div>
          <h2 className={dfSectionHeading}>Selected audit</h2>
          {!selectedAudit ? (
            <p className={`mt-2 text-base ${dfMuted}`}>Select an audit to manage findings.</p>
          ) : (
            <div className="mt-2 space-y-4 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
              <p className={`whitespace-pre-wrap text-base text-zinc-800`}>{selectedAudit.scope}</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Audit workflow status">
                {AUDIT_STATUS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={updateAudit.isPending}
                    aria-busy={updateAudit.isPending}
                    aria-pressed={selectedAudit.status === s}
                    className={selectedAudit.status === s ? statusPickActive : statusPickIdle}
                    onClick={() =>
                      updateAudit.mutate({
                        organizationId,
                        auditId: selectedAudit.id,
                        status: s,
                        ...(s === "completed" ? { completedAt: new Date() } : {}),
                      })
                    }
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>

              <div className="border-t border-zinc-100 pt-4">
                <h3 className={dfPanelMinor}>Findings</h3>
                <form
                  className="mt-2 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    createFinding.mutate({
                      organizationId,
                      internalAuditId: selectedAudit.id,
                      findingType: fType,
                      title: fTitle,
                      details: fDetails || undefined,
                    });
                  }}
                >
                  <select
                    className={dfControl}
                    value={fType}
                    aria-label="Finding type"
                    onChange={(e) =>
                      setFType(e.target.value as (typeof FINDING_TYPES)[number])
                    }
                  >
                    {FINDING_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    placeholder="Finding title"
                    className={dfControl}
                    value={fTitle}
                    onChange={(e) => setFTitle(e.target.value)}
                  />
                  <textarea
                    placeholder="Details (optional)"
                    rows={2}
                    className={dfControl}
                    value={fDetails}
                    onChange={(e) => setFDetails(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={createFinding.isPending}
                    aria-busy={createFinding.isPending}
                    className={dfPrimarySubmit}
                  >
                    Add finding
                  </button>
                </form>
                <ul className="mt-3 divide-y text-sm">
                  {loadingFindings ? (
                    <li className="py-3 text-base text-zinc-700" role="status" aria-live="polite">
                      Loading…
                    </li>
                  ) : findings?.length === 0 ? (
                    <li className="py-3 text-base text-zinc-700">No findings.</li>
                  ) : (
                    findings?.map((f) => (
                      <li key={f.id} className="py-3">
                        <span className={`capitalize ${dfHelperXs}`}>
                          {f.findingType.replace("_", " ")}
                        </span>
                        <p className="font-semibold text-zinc-900">{f.title}</p>
                        <AuditFindingCapaActions
                          organizationId={organizationId}
                          findingId={f.id}
                          findingTitle={f.title}
                          findingDetails={f.details}
                          correctiveActionId={f.correctiveActionId}
                          capaTitleById={capaTitleById}
                        />
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
