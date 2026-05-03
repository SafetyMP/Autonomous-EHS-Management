"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { OshaInjuryIllnessSection } from "@/components/osha-injury-illness-section";
import { useOrg } from "@/components/org-context";
import { trpc } from "@/trpc/react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/root";
import {
  dfControl,
  dfControlFlexible,
  dfControlMt,
  dfHelperXs,
  dfInlineNavLink,
  dfLabel,
  dfMuted,
  dfPanelHeading,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type CapaRow = RouterOutputs["capa"]["list"][number];

function hasDescriptionField(
  row: Record<string, unknown>,
): row is { description: string } {
  return typeof row.description === "string";
}

type IncidentGet = NonNullable<RouterOutputs["incident"]["get"]>;

function parseRcaFiveWhys(incident: IncidentGet): { why: string; answer: string }[] {
  const raw = (incident as { rcaFiveWhys?: unknown }).rcaFiveWhys;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ why: "", answer: "" }];
  }
  return raw.slice(0, 5).map((item) => {
    if (item && typeof item === "object" && "why" in item && "answer" in item) {
      return {
        why: String((item as { why: unknown }).why ?? ""),
        answer: String((item as { answer: unknown }).answer ?? ""),
      };
    }
    return { why: "", answer: "" };
  });
}

function parseContributingFactors(incident: IncidentGet): string[] {
  const raw = (incident as { contributingFactors?: unknown }).contributingFactors;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function IncidentWorkspaceSection({
  organizationId,
  incidentId,
}: {
  organizationId: string;
  incidentId: string;
}) {
  const { data, isLoading } = trpc.incident.workspaceLinks.useQuery(
    { organizationId, incidentId },
    { enabled: !!organizationId && !!incidentId },
  );

  if (isLoading) {
    return (
      <p className={`text-base ${dfMuted}`} role="status" aria-live="polite">
        Loading workspace links…
      </p>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className={dfSectionHeading}>Investigation workspace</h2>
      <p className={`mt-1 ${dfHelperXs}`}>
        Quick links to related IMS items and recent controlled documents (requires the matching read
        permissions).
      </p>
      <ul className="mt-3 space-y-2 text-base">
        <li>
          <span className="font-semibold text-zinc-900">Hazard: </span>
          {data.hazard ? (
            <Link href="/dashboard/planning" className={dfInlineNavLink}>
              {data.hazard.title}
            </Link>
          ) : (
            <span className={dfMuted}>None linked (see Planning to associate).</span>
          )}
        </li>
        <li>
          <span className="font-semibold text-zinc-900">Environmental aspect: </span>
          {data.environmentalAspect ? (
            <Link href="/dashboard/environment" className={dfInlineNavLink}>
              {data.environmentalAspect.name}
            </Link>
          ) : (
            <span className={dfMuted}>None linked.</span>
          )}
        </li>
        <li>
          <span className="font-semibold text-zinc-900">Recent documents: </span>
          {data.recentDocuments.length === 0 ? (
            <span className={dfMuted}>None or no document read access.</span>
          ) : (
            <ul className="mt-1 list-inside list-disc">
              {data.recentDocuments.map((d) => (
                <li key={d.id}>
                  <Link href={`/dashboard/documents/${d.id}`} className={dfInlineNavLink}>
                    {d.documentNumber} — {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>
      </ul>
    </div>
  );
}

function IncidentEvidenceSection({
  organizationId,
  incidentId,
  canRegister,
  setFormError,
}: {
  organizationId: string;
  incidentId: string;
  canRegister: boolean;
  setFormError: (msg: string | null) => void;
}) {
  const utils = trpc.useUtils();
  const { data: rows, isLoading } = trpc.ehsEvidence.list.useQuery(
    { organizationId, entityType: "incident", entityId: incidentId },
    { enabled: !!organizationId },
  );

  const [fileName, setFileName] = useState("");
  const [mimeType, setMimeType] = useState("application/octet-stream");
  const [byteSize, setByteSize] = useState("");
  const [storageUri, setStorageUri] = useState("");
  const [sha256, setSha256] = useState("");

  const register = trpc.ehsEvidence.register.useMutation({
    onSuccess: () => {
      void utils.ehsEvidence.list.invalidate({ organizationId, entityType: "incident", entityId: incidentId });
      setFileName("");
      setByteSize("");
      setStorageUri("");
      setSha256("");
      setFormError(null);
    },
    onError: (e) => setFormError(e.message),
  });

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className={dfSectionHeading}>Evidence registry</h2>
      <p className={`mt-1 ${dfHelperXs}`}>
        Immutable log of files / URIs. Upload binary via your storage pipeline (signed URL), then
        register the resulting URI here. Rows are insert-only for audit integrity.
      </p>
      {isLoading ? (
        <p className={`mt-2 text-base ${dfMuted}`} role="status" aria-live="polite">
          Loading evidence…
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-100 text-sm">
          {(rows ?? []).length === 0 ? (
            <li className="py-2 text-zinc-600">No evidence registered yet.</li>
          ) : (
            (rows ?? []).map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-1 border-b border-zinc-100 py-2 last:border-b-0 sm:flex-row sm:justify-between"
              >
                <span className="font-medium text-zinc-900">{r.fileName}</span>
                {r.storageUri.match(/^https?:\/\//i) ? (
                  <a
                    href={r.storageUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`break-all ${dfInlineNavLink}`}
                  >
                    {r.storageUri}
                  </a>
                ) : (
                  <code className="break-all text-xs text-zinc-700">{r.storageUri}</code>
                )}
                <span className={dfHelperXs}>
                  {r.byteSize} bytes · {new Date(r.createdAt).toLocaleString()}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
      {canRegister ? (
        <form
          className="mt-4 space-y-2 border-t border-zinc-100 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number.parseInt(byteSize, 10);
            if (!fileName.trim() || !storageUri.trim() || !Number.isFinite(n) || n < 1) {
              setFormError("File name, storage URI, and byte size are required.");
              return;
            }
            register.mutate({
              organizationId,
              entityType: "incident",
              entityId: incidentId,
              fileName: fileName.trim(),
              mimeType: mimeType.trim() || "application/octet-stream",
              byteSize: n,
              storageUri: storageUri.trim(),
              sha256Hex: sha256.trim() ? sha256.trim().toLowerCase() : undefined,
            });
          }}
        >
          <p className={`font-semibold ${dfHelperXs} text-zinc-800`}>Register file metadata</p>
          <input placeholder="File name" value={fileName} onChange={(e) => setFileName(e.target.value)} className={dfControl}
          />
          <input placeholder="MIME type" value={mimeType} onChange={(e) => setMimeType(e.target.value)} className={dfControl}
          />
          <input placeholder="Byte size (integer)" value={byteSize} onChange={(e) => setByteSize(e.target.value)} className={dfControl}
          />
          <input
            placeholder="Storage URI (https://… or blob key)"
            value={storageUri}
            onChange={(e) => setStorageUri(e.target.value)}
            className={dfControl}
          />
          <input placeholder="SHA-256 hex (optional)" value={sha256} onChange={(e) => setSha256(e.target.value)} className={dfControl}
          />
          <button type="submit" disabled={register.isPending} aria-busy={register.isPending} className={dfPrimarySubmit}>
            Register
          </button>
        </form>
      ) : null}
    </div>
  );
}

function IncidentInvestigationForm({
  incident,
  organizationId,
  incidentId,
  setFormError,
}: {
  incident: IncidentGet;
  organizationId: string;
  incidentId: string;
  setFormError: (msg: string | null) => void;
}) {
  const utils = trpc.useUtils();
  const canSeeNarrative = hasDescriptionField(incident as unknown as Record<string, unknown>);

  const [title, setTitle] = useState(incident.title);
  const [description, setDescription] = useState(
    canSeeNarrative ? (incident as { description: string }).description : "",
  );
  const [investigationNotes, setInvestigationNotes] = useState(
    "investigationNotes" in incident && typeof incident.investigationNotes === "string"
      ? incident.investigationNotes
      : "",
  );
  const [rootCauseSummary, setRootCauseSummary] = useState(
    "rootCauseSummary" in incident && typeof incident.rootCauseSummary === "string"
      ? incident.rootCauseSummary
      : "",
  );
  const [immediateActions, setImmediateActions] = useState(
    "immediateActions" in incident && typeof incident.immediateActions === "string"
      ? incident.immediateActions
      : "",
  );
  const [regulatoryNotificationRequired, setRegulatoryNotificationRequired] = useState(
    !!incident.regulatoryNotificationRequired,
  );
  const [rcaRows, setRcaRows] = useState(parseRcaFiveWhys(incident));
  const [factorDraft, setFactorDraft] = useState("");
  const [contributingFactors, setContributingFactors] = useState(
    parseContributingFactors(incident),
  );

  const updateIncident = trpc.incident.update.useMutation({
    onSuccess: () => {
      void utils.incident.get.invalidate({ organizationId, incidentId });
      void utils.incident.list.invalidate();
      setFormError(null);
    },
    onError: (e) => setFormError(e.message),
  });

  if (!canSeeNarrative) {
    return null;
  }

  function onSaveInvestigation(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const whysPayload = rcaRows
      .map((w) => ({ why: w.why.trim(), answer: w.answer.trim() }))
      .filter((w) => w.why.length > 0 || w.answer.length > 0)
      .slice(0, 5);
    updateIncident.mutate({
      organizationId,
      incidentId,
      title,
      description,
      investigationNotes: investigationNotes || null,
      rootCauseSummary: rootCauseSummary || null,
      immediateActions: immediateActions || null,
      regulatoryNotificationRequired,
      rcaFiveWhys: whysPayload,
      contributingFactors:
        contributingFactors.length > 0 ? contributingFactors : [],
    });
  }

  return (
    <form
      onSubmit={onSaveInvestigation}
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <h2 className={dfSectionHeading}>Record details</h2>
      <div>
        <label htmlFor="det-title" className={dfLabel}>
          Title
        </label>
        <input
          id="det-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={dfControlMt}
        />
      </div>
      <div>
        <label htmlFor="det-desc" className={dfLabel}>
          Description
        </label>
        <textarea
          id="det-desc"
          required
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={dfControlMt}
        />
      </div>
      <div>
        <label htmlFor="det-immediate" className={dfLabel}>
          Immediate actions taken
        </label>
        <textarea
          id="det-immediate"
          rows={3}
          value={immediateActions}
          onChange={(e) => setImmediateActions(e.target.value)}
          placeholder="Isolation, first aid, spill kit, etc."
          className={dfControlMt}
        />
      </div>
      <label className={`flex min-h-11 items-center gap-2 text-base ${dfMuted}`}>
        <input
          type="checkbox"
          checked={regulatoryNotificationRequired}
          onChange={(e) => setRegulatoryNotificationRequired(e.target.checked)}
          className="size-4"
        />
        Regulatory notification may be required
      </label>
      <div>
        <label htmlFor="det-inv" className={dfLabel}>
          Investigation notes
        </label>
        <textarea
          id="det-inv"
          rows={4}
          value={investigationNotes}
          onChange={(e) => setInvestigationNotes(e.target.value)}
          className={dfControlMt}
        />
      </div>
      <div className="space-y-3 rounded-md border border-zinc-100 bg-zinc-50/80 p-4">
        <h3 className={dfPanelHeading}>Structured 5-Whys (optional)</h3>
        {rcaRows.map((row, idx) => (
          <div key={idx} className="space-y-2 rounded border border-zinc-200 bg-white p-3">
            <p className={`font-semibold ${dfHelperXs} text-zinc-800`}>Step {idx + 1}</p>
            <input
              placeholder="Why…"
              value={row.why}
              onChange={(e) => {
                const next = [...rcaRows];
                next[idx] = { ...next[idx]!, why: e.target.value };
                setRcaRows(next);
              }}
              className={dfControl}
            />
            <textarea
              placeholder="Because / response…"
              rows={2}
              value={row.answer}
              onChange={(e) => {
                const next = [...rcaRows];
                next[idx] = { ...next[idx]!, answer: e.target.value };
                setRcaRows(next);
              }}
              className={dfControl}
            />
          </div>
        ))}
        {rcaRows.length < 5 ? (
          <button
            type="button"
            className="min-h-11 touch-target rounded-md text-base font-semibold text-emerald-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            onClick={() => setRcaRows([...rcaRows, { why: "", answer: "" }])}
          >
            Add why step
          </button>
        ) : null}
      </div>
      <div>
        <h3 className={dfPanelHeading}>Contributing factors</h3>
        <p className={dfHelperXs}>Short labels (e.g. training gap, equipment defect).</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {contributingFactors.map((f, idx) => (
            <span
              key={`${f}-${idx}`}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-950"
            >
              {f}
              <button
                type="button"
                aria-label={`Remove ${f}`}
                className="font-bold text-emerald-900"
                onClick={() =>
                  setContributingFactors(contributingFactors.filter((_, i) => i !== idx))
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            placeholder="Add factor"
            value={factorDraft}
            onChange={(e) => setFactorDraft(e.target.value)}
            className={`${dfControlFlexible} min-w-[12rem] flex-1`}
          />
          <button type="button" className={dfSecondaryOutline}
            onClick={() => {
              const v = factorDraft.trim();
              if (!v || contributingFactors.includes(v) || contributingFactors.length >= 24) return;
              setContributingFactors([...contributingFactors, v]);
              setFactorDraft("");
            }}
          >
            Add
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="det-rc" className={dfLabel}>
          Root cause summary (required before closure, min. 20 characters)
        </label>
        <textarea
          id="det-rc"
          rows={3}
          value={rootCauseSummary}
          onChange={(e) => setRootCauseSummary(e.target.value)}
          className={dfControlMt}
        />
      </div>
      <button
        type="submit"
        disabled={updateIncident.isPending}
        aria-busy={updateIncident.isPending}
        className={dfPrimarySubmit}
      >
        {updateIncident.isPending ? "Saving…" : "Save updates"}
      </button>
    </form>
  );
}

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const incidentId = params.incidentId as string;
  const { organizationId } = useOrg();
  const utils = trpc.useUtils();

  const [error, setError] = useState<string | null>(null);
  const [closureNotes, setClosureNotes] = useState("");
  const [showClose, setShowClose] = useState(false);

  const { data: incident, isLoading, isError, error: loadError } =
    trpc.incident.get.useQuery(
      { organizationId: organizationId!, incidentId },
      { enabled: !!organizationId },
    );

  const { data: capas } = trpc.capa.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const linkedCapas = useMemo(
    () => capas?.filter((c: CapaRow) => c.incidentId === incidentId) ?? [],
    [capas, incidentId],
  );

  const updateStatus = trpc.incident.updateStatus.useMutation({
    onSuccess: () => {
      void utils.incident.get.invalidate({ organizationId: organizationId!, incidentId });
      void utils.incident.list.invalidate();
      setError(null);
      setShowClose(false);
      setClosureNotes("");
      router.push("/dashboard/incidents");
    },
    onError: (e) => setError(e.message),
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Incident</h1>
        <OrgSwitcher />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <p className="text-base text-zinc-600" role="status" aria-live="polite">
          Loading incident…
        </p>
        <Link
          href="/dashboard/incidents"
          className="text-emerald-800 underline underline-offset-2"
        >
          Back to incidents
        </Link>
      </div>
    );
  }

  if (isError || !incident) {
    return (
      <div className="space-y-4">
        <p className="text-base text-red-700" role="alert">
          {loadError?.message ?? "Incident not found."}
        </p>
        <Link
          href="/dashboard/incidents"
          className="text-emerald-800 underline underline-offset-2"
        >
          Back to incidents
        </Link>
      </div>
    );
  }

  const canSeeNarrative = hasDescriptionField(incident as unknown as Record<string, unknown>);
  const readOnlyMessage =
    !canSeeNarrative &&
    "Full narrative and investigation fields require the incident sensitive-read permission.";

  const formRemountKey = `${incident.id}-${+incident.updatedAt}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Incident</h1>
          <p className="text-sm text-zinc-600 capitalize">
            {incident.status.replace("_", " ")} · {incident.severity} ·{" "}
            {String(incident.incidentType).replace("_", " ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <OrgSwitcher />
          <Link
            href="/dashboard/incidents"
            className={`${dfSecondaryOutline} px-4 py-2 no-underline hover:no-underline`}
          >
            Back
          </Link>
        </div>
      </div>

      {!canSeeNarrative ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {readOnlyMessage}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <IncidentWorkspaceSection organizationId={organizationId} incidentId={incidentId} />

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className={dfSectionHeading}>Workflow</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {incident.status === "open" ? (
            <button
              type="button"
              className={dfPrimarySubmit}
              disabled={updateStatus.isPending}
              aria-busy={updateStatus.isPending}
              onClick={() => {
                setError(null);
                updateStatus.mutate({
                  organizationId,
                  incidentId,
                  status: "investigating",
                });
              }}
            >
              Start investigation
            </button>
          ) : null}
          {incident.status === "investigating" ? (
            <button
              type="button"
              className="min-h-11 touch-target rounded-md bg-zinc-800 px-4 py-2 text-base font-semibold text-white hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2"
              onClick={() => {
                setError(null);
                setShowClose(true);
              }}
            >
              Close incident
            </button>
          ) : null}
        </div>
        <p className={`mt-2 ${dfHelperXs}`}>
          Incidents must move to <strong>investigating</strong> before closure. Closing requires a
          root cause summary and a closure justification (recorded in the audit trail).
        </p>
      </div>

      {showClose ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-incident-title"
        >
          <div className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white p-6 shadow-lg">
            <h2 id="close-incident-title" className="text-lg font-semibold text-zinc-900">
              Close incident
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Confirm why this event can be closed safely (min. 20 characters). This is stored in
              the audit log.
            </p>
            <textarea
              className={`mt-3 min-h-[6rem] ${dfControl}`}
              value={closureNotes}
              onChange={(e) => setClosureNotes(e.target.value)}
              placeholder="e.g. Root cause addressed via guardrails; CAPA-12 verified effective on 2/1…"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={dfPrimarySubmit}
                disabled={updateStatus.isPending || closureNotes.trim().length < 20}
                aria-busy={updateStatus.isPending}
                onClick={() => {
                  setError(null);
                  updateStatus.mutate({
                    organizationId,
                    incidentId,
                    status: "closed",
                    closureJustification: closureNotes.trim(),
                  });
                }}
              >
                Confirm close
              </button>
              <button type="button" className={dfSecondaryOutline}
                onClick={() => {
                  setShowClose(false);
                  setClosureNotes("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {canSeeNarrative ? (
        <IncidentInvestigationForm
          key={formRemountKey}
          incident={incident}
          organizationId={organizationId}
          incidentId={incidentId}
          setFormError={setError}
        />
      ) : null}

      <IncidentEvidenceSection
        organizationId={organizationId}
        incidentId={incidentId}
        canRegister={canSeeNarrative}
        setFormError={setError}
      />

      <OshaInjuryIllnessSection organizationId={organizationId} incidentId={incidentId} />

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className={dfSectionHeading}>Linked corrective actions</h2>
        {linkedCapas.length === 0 ? (
          <p className={`mt-2 text-base ${dfMuted}`}>None linked yet.</p>
        ) : (
          <ul className="mt-2 list-inside list-disc text-base text-zinc-900">
            {linkedCapas.map((c: CapaRow) => (
              <li key={c.id}>
                <Link href="/dashboard/capa" className={dfInlineNavLink}>
                  {c.title}
                </Link>{" "}
                ({c.status.replace("_", " ")})
              </li>
            ))}
          </ul>
        )}
        <p className={`mt-3 ${dfHelperXs}`}>
          Create or link CAPAs from the{" "}
          <Link href="/dashboard/capa" className={dfInlineNavLink}>
            CAPA
          </Link>{" "}
          screen.
        </p>
      </div>
    </div>
  );
}
