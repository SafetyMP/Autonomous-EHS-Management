"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfControlFlexible,
  dfHelperXs,
  dfMuted,
  dfPrimarySubmit,
  dfSecondaryOutline,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

const kindOptions = ["insurance_coi", "permit", "training_proof", "other"] as const;
const statusOptions = ["pending_review", "active", "expired", "rejected"] as const;

function siteAccessBannerClass(status: string | undefined): string {
  if (status === "blocked") return "border-red-300 bg-red-50 text-red-950";
  if (status === "review_required") return "border-amber-300 bg-amber-50 text-amber-950";
  if (status === "cleared") return "border-emerald-300 bg-emerald-50 text-emerald-950";
  return "border-zinc-300 bg-zinc-50 text-zinc-900";
}

function siteAccessLabel(status: string | undefined): string {
  if (status === "blocked") return "Site access blocked (program signal)";
  if (status === "review_required") return "Review required before site access";
  if (status === "cleared") return "Site access cleared (program signal)";
  return "Site access status unknown";
}

export default function ContractorDetailPage() {
  const params = useParams();
  const externalPartyId = typeof params.id === "string" ? params.id : "";
  const notesId = useId();
  const bulkStatusId = useId();
  const { organizationId } = useOrg();
  const org = organizationId!;

  const party = trpc.externalParty.getParty.useQuery(
    { organizationId: org, externalPartyId },
    { enabled: !!organizationId && !!externalPartyId },
  );
  const credentials = trpc.externalParty.listCredentials.useQuery(
    { organizationId: org, externalPartyId },
    { enabled: !!organizationId && !!externalPartyId },
  );

  const [kind, setKind] = useState<(typeof kindOptions)[number]>("insurance_coi");
  const [identifier, setIdentifier] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [evidenceUri, setEvidenceUri] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<(typeof statusOptions)[number]>("active");

  const createCred = trpc.externalParty.createCredential.useMutation({
    onSuccess: () => {
      void credentials.refetch();
      void party.refetch();
      setIdentifier("");
      setValidFrom("");
      setValidTo("");
      setEvidenceUri("");
      setNotes("");
    },
  });

  const updateCred = trpc.externalParty.updateCredential.useMutation({
    onSuccess: () => {
      void credentials.refetch();
      void party.refetch();
    },
  });

  const bulkUpdate = trpc.externalParty.bulkUpdateCredentialStatus.useMutation({
    onSuccess: () => {
      void credentials.refetch();
      void party.refetch();
      setSelectedIds(new Set());
    },
  });

  const allCredentialIds = useMemo(
    () => credentials.data?.map((c) => c.id) ?? [],
    [credentials.data],
  );
  const allSelected =
    allCredentialIds.length > 0 && allCredentialIds.every((id) => selectedIds.has(id));

  function toggleCredential(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(allCredentialIds) : new Set());
  }

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Party credentials</h1>
        <OrgSwitcher />
      </div>
    );
  }

  if (party.isError) {
    return (
      <div className="space-y-4" role="alert">
        <p className="text-base text-red-800">Could not load this party.</p>
        <Link href="/dashboard/contractors" className="text-emerald-900 underline">
          Back to list
        </Link>
      </div>
    );
  }

  const compliance = party.data?.compliance;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-600">
            <Link href="/dashboard/contractors" className="text-emerald-900 underline">
              Contractors &amp; visitors
            </Link>
          </p>
          <h1 className="mt-1 text-xl font-semibold text-zinc-900">
            {party.data?.companyName ?? "Loading…"}
          </h1>
          <p className={`mt-1 ${dfMuted}`}>
            Type:{" "}
            <span className="capitalize">
              {party.data?.partyType.replace("_", " ") ?? "—"}
            </span>
          </p>
        </div>
        <OrgSwitcher />
      </div>

      {compliance ? (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 ${siteAccessBannerClass(compliance.siteAccessStatus)}`}
        >
          <p className="font-semibold">{siteAccessLabel(compliance.siteAccessStatus)}</p>
          <p className={`mt-1 text-sm ${dfHelperXs}`}>
            Program-level compliance signal — not a physical gate controller. Active credentials:{" "}
            {compliance.activeCredentialCount} · Expired: {compliance.expiredCredentialCount} · Due
            30d: {compliance.dueSoonCredentialCount}.
          </p>
          {compliance.reasons.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-sm">
              {compliance.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <section
        aria-labelledby="new-cred-heading"
        className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <h2 id="new-cred-heading" className="text-base font-semibold text-zinc-900">
          Add compliance credential
        </h2>
        <p className={`mt-2 text-sm ${dfMuted}`}>
          For contractors, upload or link a current <strong>certificate of insurance (COI)</strong>{" "}
          before marking active. Use HTTPS URLs or internal storage references — retain originals per
          your document control policy.
        </p>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            let vf: Date | undefined;
            let vt: Date | undefined;
            if (validFrom.trim()) {
              const d = new Date(`${validFrom}T12:00:00`);
              if (!Number.isNaN(d.getTime())) vf = d;
            }
            if (validTo.trim()) {
              const d = new Date(`${validTo}T12:00:00`);
              if (!Number.isNaN(d.getTime())) vt = d;
            }
            createCred.mutate({
              organizationId: org,
              externalPartyId,
              kind,
              identifier: identifier.trim() || undefined,
              validFrom: vf,
              validTo: vt,
              evidenceUri: evidenceUri.trim() || undefined,
              notes: notes.trim() || undefined,
            });
          }}
        >
          <div className="flex flex-wrap gap-3">
            <label className="block min-w-[10rem] flex-1 text-sm font-medium text-zinc-900">
              Kind
              <select
                className={`mt-1 ${dfControlFlexible}`}
                value={kind}
                onChange={(e) => setKind(e.target.value as (typeof kindOptions)[number])}
              >
                {kindOptions.map((k) => (
                  <option key={k} value={k}>
                    {k.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-[10rem] flex-1 text-sm font-medium text-zinc-900">
              Policy / permit ID
              <input
                className={`mt-1 ${dfControlFlexible}`}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="block min-w-[10rem] text-sm font-medium text-zinc-900">
              Valid from
              <input
                type="date"
                className={`mt-1 ${dfControlFlexible}`}
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </label>
            <label className="block min-w-[10rem] text-sm font-medium text-zinc-900">
              Valid to
              <input
                type="date"
                className={`mt-1 ${dfControlFlexible}`}
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-zinc-900">
            Evidence link (URL or storage reference)
            <input
              className={`mt-1 ${dfControlFlexible}`}
              value={evidenceUri}
              onChange={(e) => setEvidenceUri(e.target.value)}
              placeholder="https://… or internal reference"
            />
          </label>
          <p className={`text-xs ${dfHelperXs}`}>
            Tip: link to controlled document storage or blob URL. Auditors need valid-to dates and
            active status for COI before site access clearance.
          </p>
          <label className="block text-sm font-medium text-zinc-900" htmlFor={notesId}>
            Notes
            <textarea
              id={notesId}
              rows={2}
              className={`mt-1 ${dfControlFlexible}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={createCred.isPending}
            aria-busy={createCred.isPending}
            className={dfPrimarySubmit}
          >
            {createCred.isPending ? "Saving…" : "Add credential"}
          </button>
        </form>
      </section>

      {selectedIds.size > 0 ? (
        <form
          className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            bulkUpdate.mutate({
              organizationId: org,
              credentialIds: [...selectedIds],
              status: bulkStatus,
            });
          }}
        >
          <p className="w-full text-sm font-medium text-zinc-900">
            Bulk update {selectedIds.size} credential{selectedIds.size === 1 ? "" : "s"}
          </p>
          <label className="block text-sm font-medium text-zinc-900" htmlFor={bulkStatusId}>
            New status
            <select
              id={bulkStatusId}
              className={`mt-1 ${dfControlFlexible}`}
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as (typeof statusOptions)[number])}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={bulkUpdate.isPending}
            className={`${dfSecondaryOutline} disabled:opacity-50`}
          >
            {bulkUpdate.isPending ? "Updating…" : "Apply to selected"}
          </button>
          <button
            type="button"
            className={`${dfSecondaryOutline} text-sm`}
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </button>
          {bulkUpdate.error ? (
            <p className="w-full text-sm text-red-800" role="alert">
              {bulkUpdate.error.message}
            </p>
          ) : null}
        </form>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <h2 className="sr-only">Credential timeline</h2>
        <table className="min-w-full divide-y divide-zinc-200 text-base">
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-800">
            <tr>
              <th scope="col" className="px-4 py-3">
                <label className="flex items-center gap-2 font-normal normal-case">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    aria-label="Select all credentials"
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                  Select
                </label>
              </th>
              <th scope="col" className="px-4 py-3">
                Kind
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3">
                Valid
              </th>
              <th scope="col" className="px-4 py-3">
                ID / link
              </th>
              <th scope="col" className="px-4 py-3">
                Update status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {credentials.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6">
                  <span role="status" aria-live="polite">
                    Loading credentials…
                  </span>
                </td>
              </tr>
            ) : credentials.data?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-zinc-700">
                  No credentials recorded yet.
                </td>
              </tr>
            ) : (
              credentials.data?.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      aria-label={`Select ${c.kind} credential`}
                      onChange={(e) => toggleCredential(c.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-4 py-3 capitalize">{c.kind.replace("_", " ")}</td>
                  <td className="px-4 py-3 capitalize">{c.status.replace("_", " ")}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-800">
                    {c.validFrom || c.validTo ? (
                      <>
                        {c.validFrom
                          ? new Date(c.validFrom).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}{" "}
                        –{" "}
                        {c.validTo
                          ? new Date(c.validTo).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-[12rem] truncate px-4 py-3 text-sm text-zinc-800">
                    {c.evidenceUri ? (
                      <a
                        href={c.evidenceUri.startsWith("http") ? c.evidenceUri : undefined}
                        className="text-emerald-900 underline"
                        target={c.evidenceUri.startsWith("http") ? "_blank" : undefined}
                        rel={c.evidenceUri.startsWith("http") ? "noopener noreferrer" : undefined}
                      >
                        {c.identifier ?? c.evidenceUri}
                      </a>
                    ) : (
                      (c.identifier ?? "—")
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <label htmlFor={`status-${c.id}`} className="sr-only">
                      Status for credential {c.kind}
                    </label>
                    <select
                      id={`status-${c.id}`}
                      className={`${dfControlFlexible} text-sm`}
                      value={c.status}
                      disabled={updateCred.isPending}
                      onChange={(e) => {
                        updateCred.mutate({
                          organizationId: org,
                          credentialId: c.id,
                          status: e.target.value as (typeof statusOptions)[number],
                        });
                      }}
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
