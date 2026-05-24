"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { IncidentLinkedCapaSection } from "@/components/dashboard/incident-linked-capa-section";
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
import {
  RCA_FISHBONE_CATEGORY_IDS,
  RCA_FISHBONE_LABELS,
  type RcaFishboneBranch,
  type RcaFishboneCategoryId,
} from "@/lib/rcaFishbone";
import {
  bowTieBarrierOutcomeEnum,
  causalFactorCategoryEnum,
  type BowTieBarrierOutcome,
  type InvestigationBowTieInput,
} from "@/lib/investigation/structuredInvestigation";

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

function parseRcaFishbone(incident: IncidentGet): RcaFishboneBranch[] {
  const raw = (incident as { rcaFishbone?: unknown }).rcaFishbone;
  const map = new Map<RcaFishboneCategoryId, string[]>();
  for (const id of RCA_FISHBONE_CATEGORY_IDS) {
    map.set(id, []);
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item && typeof item === "object" && "categoryId" in item && "causes" in item) {
        const id = String((item as { categoryId: unknown }).categoryId);
        if (!RCA_FISHBONE_CATEGORY_IDS.includes(id as RcaFishboneCategoryId)) continue;
        const causes = (item as { causes: unknown }).causes;
        if (!Array.isArray(causes)) continue;
        const list = causes
          .filter((c): c is string => typeof c === "string")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 12);
        map.set(id as RcaFishboneCategoryId, list);
      }
    }
  }
  return RCA_FISHBONE_CATEGORY_IDS.map((categoryId) => ({
    categoryId,
    causes: map.get(categoryId) ?? [],
  }));
}

function parseContributingFactors(incident: IncidentGet): string[] {
  const raw = (incident as { contributingFactors?: unknown }).contributingFactors;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isBowTieBarrierOutcome(x: string): x is BowTieBarrierOutcome {
  return (bowTieBarrierOutcomeEnum as readonly string[]).includes(x);
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseInvestigationBowTie(incident: IncidentGet): InvestigationBowTieInput {
  const raw = (incident as { investigationBowTie?: unknown }).investigationBowTie;
  if (!raw || typeof raw !== "object") {
    return { topEvent: "", threats: [], consequences: [], notes: null };
  }
  const o = raw as Record<string, unknown>;
  const topEvent = typeof o.topEvent === "string" ? o.topEvent : "";
  const notes =
    o.notes == null
      ? null
      : typeof o.notes === "string"
        ? o.notes
        : null;
  const threats: InvestigationBowTieInput["threats"] = [];
  if (Array.isArray(o.threats)) {
    for (const t of o.threats) {
      if (!t || typeof t !== "object") continue;
      const desc = typeof (t as { description?: unknown }).description === "string" ? (t as { description: string }).description : "";
      const pb = (t as { preventiveBarriers?: unknown }).preventiveBarriers;
      const preventiveBarriers: { description: string; outcome: BowTieBarrierOutcome }[] = [];
      if (Array.isArray(pb)) {
        for (const b of pb) {
          if (!b || typeof b !== "object") continue;
          const bd =
            typeof (b as { description?: unknown }).description === "string"
              ? (b as { description: string }).description
              : "";
          const oc = String((b as { outcome?: unknown }).outcome ?? "unknown");
          const outcome = isBowTieBarrierOutcome(oc) ? oc : "unknown";
          preventiveBarriers.push({ description: bd, outcome });
        }
      }
      threats.push({ description: desc, preventiveBarriers });
    }
  }
  const consequences: InvestigationBowTieInput["consequences"] = [];
  if (Array.isArray(o.consequences)) {
    for (const c of o.consequences) {
      if (!c || typeof c !== "object") continue;
      const desc = typeof (c as { description?: unknown }).description === "string" ? (c as { description: string }).description : "";
      const mb = (c as { mitigativeBarriers?: unknown }).mitigativeBarriers;
      const mitigativeBarriers: { description: string; outcome: BowTieBarrierOutcome }[] = [];
      if (Array.isArray(mb)) {
        for (const b of mb) {
          if (!b || typeof b !== "object") continue;
          const bd =
            typeof (b as { description?: unknown }).description === "string"
              ? (b as { description: string }).description
              : "";
          const oc = String((b as { outcome?: unknown }).outcome ?? "unknown");
          const outcome = isBowTieBarrierOutcome(oc) ? oc : "unknown";
          mitigativeBarriers.push({ description: bd, outcome });
        }
      }
      consequences.push({ description: desc, mitigativeBarriers });
    }
  }
  return { topEvent, threats, consequences, notes };
}

type ChronologyFormRow = { occurredAtInput: string; description: string };

function parseInvestigationChronology(incident: IncidentGet): ChronologyFormRow[] {
  const raw = (incident as { investigationChronology?: unknown }).investigationChronology;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ occurredAtInput: "", description: "" }];
  }
  return raw.map((item) => {
    let occurredAtInput = "";
    if (item && typeof item === "object" && "occurredAt" in item) {
      const d = (item as { occurredAt: unknown }).occurredAt;
      if (d instanceof Date && !Number.isNaN(d.getTime())) {
        occurredAtInput = toDatetimeLocalValue(d);
      } else if (typeof d === "string" && d) {
        const parsed = new Date(d);
        if (!Number.isNaN(parsed.getTime())) occurredAtInput = toDatetimeLocalValue(parsed);
      }
    }
    const description =
      item && typeof item === "object" && typeof (item as { description?: unknown }).description === "string"
        ? (item as { description: string }).description
        : "";
    return { occurredAtInput, description };
  });
}

type CausalFactorFormRow = {
  summary: string;
  category: string;
  barriersFailed: string[];
};

function parseInvestigationCausalFactors(incident: IncidentGet): CausalFactorFormRow[] {
  const raw = (incident as { investigationCausalFactors?: unknown }).investigationCausalFactors;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((item) => {
    if (!item || typeof item !== "object") {
      return { summary: "", category: "", barriersFailed: [] };
    }
    const summary = typeof (item as { summary?: unknown }).summary === "string" ? (item as { summary: string }).summary : "";
    const cat = (item as { category?: unknown }).category;
    const category = typeof cat === "string" ? cat : "";
    const bf = (item as { barriersFailed?: unknown }).barriersFailed;
    const barriersFailed = Array.isArray(bf)
      ? bf.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
      : [];
    return { summary, category, barriersFailed };
  });
}

const BARRIER_OUTCOME_LABELS: Record<BowTieBarrierOutcome, string> = {
  effective: "Effective / in place",
  failed_degraded: "Failed or degraded",
  unknown: "Unknown",
};

function CausalBarrierFailedAddRow({
  rowIndex,
  onAdd,
}: {
  rowIndex: number;
  onAdd: (label: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <input
        aria-label={`New barrier failed label for causal factor ${rowIndex + 1}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className={`${dfControlFlexible} min-w-[12rem] flex-1`}
        placeholder="Add barrier label"
      />
      <button
        type="button"
        className={dfSecondaryOutline}
        onClick={() => {
          onAdd(draft);
          setDraft("");
        }}
      >
        Add
      </button>
    </div>
  );
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
            <Link href={`/dashboard/planning?hazard=${data.hazard.id}`} className={dfInlineNavLink}>
              {data.hazard.title}
            </Link>
          ) : (
            <span className={dfMuted}>None linked (see Planning to associate).</span>
          )}
        </li>
        <li>
          <span className="font-semibold text-zinc-900">Environmental aspect: </span>
          {data.environmentalAspect ? (
            <Link
              href={`/dashboard/environment?aspect=${data.environmentalAspect.id}`}
              className={dfInlineNavLink}
            >
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

function IncidentRelatedCapasSection({
  organizationId,
  incidentId,
}: {
  organizationId: string;
  incidentId: string;
}) {
  const { data: capas } = trpc.capa.list.useQuery(
    { organizationId },
    { enabled: !!organizationId },
  );

  const related = useMemo(
    () => capas?.filter((c) => c.incidentId === incidentId) ?? [],
    [capas, incidentId],
  );

  if (related.length === 0) return null;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm">
      <h2 className={dfSectionHeading}>Related corrective actions</h2>
      <p className="mt-1 text-base text-zinc-600">CAPAs opened from this incident.</p>
      <ul className="mt-3 space-y-2 text-base">
        {related.map((c) => (
          <li key={c.id}>
            <Link href={`/dashboard/capa#capa-row-${c.id}`} className={dfInlineNavLink}>
              {c.title}
            </Link>
            <span className={`ml-2 text-sm capitalize text-zinc-600`}>{c.status.replaceAll("_", " ")}</span>
          </li>
        ))}
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
  const [fishbone, setFishbone] = useState(parseRcaFishbone(incident));
  const [bowTie, setBowTie] = useState(parseInvestigationBowTie(incident));
  const [chronology, setChronology] = useState(parseInvestigationChronology(incident));
  const [causalFactors, setCausalFactors] = useState(parseInvestigationCausalFactors(incident));
  const [factorDraft, setFactorDraft] = useState("");
  const [contributingFactors, setContributingFactors] = useState(
    parseContributingFactors(incident),
  );
  const [occurredAtLocal, setOccurredAtLocal] = useState(() =>
    incident.occurredAt && !Number.isNaN(new Date(incident.occurredAt).getTime())
      ? toDatetimeLocalValue(new Date(incident.occurredAt))
      : "",
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
    const fishbonePayload = fishbone.map((b) => ({
      categoryId: b.categoryId,
      causes: b.causes.map((c) => c.trim()).filter(Boolean).slice(0, 12),
    }));
    const chronologyPayload = chronology.map((c, i) => ({
      sortOrder: i,
      occurredAt: c.occurredAtInput.trim() ? new Date(c.occurredAtInput) : null,
      description: c.description,
    }));
    const causalPayload = causalFactors.map((r) => ({
      summary: r.summary,
      category:
        r.category && (causalFactorCategoryEnum as readonly string[]).includes(r.category)
          ? (r.category as (typeof causalFactorCategoryEnum)[number])
          : null,
      barriersFailed: r.barriersFailed,
    }));
    updateIncident.mutate({
      organizationId,
      incidentId,
      title,
      description,
      occurredAt: occurredAtLocal.trim() ? new Date(occurredAtLocal) : null,
      investigationNotes: investigationNotes || null,
      rootCauseSummary: rootCauseSummary || null,
      immediateActions: immediateActions || null,
      regulatoryNotificationRequired,
      rcaFiveWhys: whysPayload,
      rcaFishbone: fishbonePayload,
      contributingFactors:
        contributingFactors.length > 0 ? contributingFactors : [],
      investigationBowTie: bowTie,
      investigationChronology: chronologyPayload,
      investigationCausalFactors: causalPayload,
    });
  }

  return (
    <form
      onSubmit={onSaveInvestigation}
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <h2 className={dfSectionHeading}>Record details</h2>
      <div>
        <label htmlFor="det-occurred" className={dfLabel}>
          When it occurred (optional)
        </label>
        <input
          id="det-occurred"
          type="datetime-local"
          value={occurredAtLocal}
          onChange={(e) => setOccurredAtLocal(e.target.value)}
          className={dfControlMt}
        />
        <p className={`mt-1 ${dfHelperXs}`}>
          Leave blank if unknown; you can refine later. This is separate from investigation timeline
          steps below.
        </p>
      </div>
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
      <div className="space-y-3 rounded-md border border-zinc-100 bg-zinc-50/80 p-4">
        <h3 className={dfPanelHeading}>Fishbone (Ishikawa) — optional</h3>
        <p className={dfHelperXs}>
          Group possible causes under standard categories. Complements 5 Whys; it does not replace the
          written root cause summary above.
        </p>
        <div className="space-y-4">
          {fishbone.map((bone, boneIdx) => {
            const label = RCA_FISHBONE_LABELS[bone.categoryId];
            return (
              <fieldset
                key={bone.categoryId}
                className="space-y-2 rounded border border-zinc-200 bg-white p-3"
              >
                <legend className={`text-sm font-semibold text-zinc-900`}>{label}</legend>
                <p className={`${dfHelperXs} text-zinc-600`}>Causes for this branch (max 12).</p>
                {bone.causes.map((cause, cIdx) => (
                  <div key={cIdx} className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`fb-${bone.categoryId}-${cIdx}`}>
                      {label} cause {cIdx + 1}
                    </label>
                    <input
                      id={`fb-${bone.categoryId}-${cIdx}`}
                      value={cause}
                      onChange={(e) => {
                        const next = fishbone.map((b, bi) =>
                          bi !== boneIdx
                            ? b
                            : {
                                ...b,
                                causes: b.causes.map((c, ci) => (ci === cIdx ? e.target.value : c)),
                              },
                        );
                        setFishbone(next);
                      }}
                      className={`${dfControlFlexible} min-w-[12rem] flex-1`}
                      placeholder="Describe a cause…"
                    />
                    <button
                      type="button"
                      className={dfSecondaryOutline}
                      onClick={() => {
                        setFishbone(
                          fishbone.map((b, bi) =>
                            bi !== boneIdx
                              ? b
                              : { ...b, causes: b.causes.filter((_, ci) => ci !== cIdx) },
                          ),
                        );
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {bone.causes.length < 12 ? (
                  <button
                    type="button"
                    className="min-h-11 touch-target rounded-md text-base font-semibold text-emerald-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                    onClick={() => {
                      setFishbone(
                        fishbone.map((b, bi) =>
                          bi !== boneIdx ? b : { ...b, causes: [...b.causes, ""] },
                        ),
                      );
                    }}
                  >
                    Add cause in {label}
                  </button>
                ) : null}
              </fieldset>
            );
          })}
        </div>
      </div>
      <div className="space-y-4 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className={dfPanelHeading}>Structured investigation</h3>
        <p className={dfHelperXs}>
          Bow-tie, event sequence, and causal factors support barrier thinking and traceability. They
          do not replace legal review or any specific commercial investigation methodology.
        </p>

        <div className="space-y-3 rounded-md border border-zinc-100 bg-zinc-50/80 p-4">
          <h4 className={`text-sm font-semibold text-zinc-900`}>Bow-tie (barriers)</h4>
          <div>
            <label htmlFor="bt-top" className={dfLabel}>
              Top event
            </label>
            <textarea
              id="bt-top"
              rows={2}
              value={bowTie.topEvent}
              onChange={(e) => setBowTie({ ...bowTie, topEvent: e.target.value })}
              className={dfControlMt}
              placeholder="Central unwanted event (loss of containment, contact with energy, etc.)"
            />
          </div>
          <div>
            <label htmlFor="bt-notes" className={dfLabel}>
              Bow-tie notes (optional)
            </label>
            <textarea
              id="bt-notes"
              rows={2}
              value={bowTie.notes ?? ""}
              onChange={(e) =>
                setBowTie({
                  ...bowTie,
                  notes: e.target.value.trim() === "" ? null : e.target.value,
                })
              }
              className={dfControlMt}
            />
          </div>

          <div className="space-y-3">
            <p className={`text-sm font-medium text-zinc-800`}>Threats / preventive side</p>
            {bowTie.threats.map((threat, tIdx) => (
              <fieldset
                key={`threat-${tIdx}`}
                className="space-y-2 rounded border border-zinc-200 bg-white p-3"
              >
                <legend className="sr-only">Threat scenario {tIdx + 1}</legend>
                <p className={`${dfHelperXs} font-medium text-zinc-800`}>Threat {tIdx + 1}</p>
                <textarea
                  aria-label={`Threat ${tIdx + 1} description`}
                  rows={2}
                  value={threat.description}
                  onChange={(e) => {
                    const threats = bowTie.threats.map((t, i) =>
                      i === tIdx ? { ...t, description: e.target.value } : t,
                    );
                    setBowTie({ ...bowTie, threats });
                  }}
                  className={dfControl}
                  placeholder="Threat or pathway toward the top event…"
                />
                <p className={dfHelperXs}>Preventive barriers</p>
                {threat.preventiveBarriers.map((bar, bIdx) => (
                  <div key={bIdx} className="flex flex-wrap items-end gap-2">
                    <div className={`min-w-[12rem] flex-1`}>
                      <label className="sr-only" htmlFor={`bt-th-${tIdx}-bar-${bIdx}-desc`}>
                        Preventive barrier {bIdx + 1} description
                      </label>
                      <input
                        id={`bt-th-${tIdx}-bar-${bIdx}-desc`}
                        value={bar.description}
                        onChange={(e) => {
                          const threats = bowTie.threats.map((th, ti) => {
                            if (ti !== tIdx) return th;
                            return {
                              ...th,
                              preventiveBarriers: th.preventiveBarriers.map((pb, pi) =>
                                pi === bIdx ? { ...pb, description: e.target.value } : pb,
                              ),
                            };
                          });
                          setBowTie({ ...bowTie, threats });
                        }}
                        className={dfControl}
                        placeholder="Barrier…"
                      />
                    </div>
                    <div>
                      <label className="sr-only" htmlFor={`bt-th-${tIdx}-bar-${bIdx}-out`}>
                        Outcome
                      </label>
                      <select
                        id={`bt-th-${tIdx}-bar-${bIdx}-out`}
                        value={bar.outcome}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!isBowTieBarrierOutcome(v)) return;
                          const threats = bowTie.threats.map((th, ti) => {
                            if (ti !== tIdx) return th;
                            return {
                              ...th,
                              preventiveBarriers: th.preventiveBarriers.map((pb, pi) =>
                                pi === bIdx ? { ...pb, outcome: v } : pb,
                              ),
                            };
                          });
                          setBowTie({ ...bowTie, threats });
                        }}
                        className={`${dfControl} min-w-[10rem]`}
                      >
                        {bowTieBarrierOutcomeEnum.map((o) => (
                          <option key={o} value={o}>
                            {BARRIER_OUTCOME_LABELS[o]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className={dfSecondaryOutline}
                      onClick={() => {
                        const threats = bowTie.threats.map((th, ti) =>
                          ti !== tIdx
                            ? th
                            : {
                                ...th,
                                preventiveBarriers: th.preventiveBarriers.filter((_, bi) => bi !== bIdx),
                              },
                        );
                        setBowTie({ ...bowTie, threats });
                      }}
                    >
                      Remove barrier
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={dfSecondaryOutline}
                    onClick={() => {
                      const threats = bowTie.threats.map((th, ti) =>
                        ti !== tIdx
                          ? th
                          : {
                              ...th,
                              preventiveBarriers: [
                                ...th.preventiveBarriers,
                                { description: "", outcome: "unknown" as const },
                              ],
                            },
                      );
                      setBowTie({ ...bowTie, threats });
                    }}
                  >
                    Add preventive barrier
                  </button>
                  <button
                    type="button"
                    className={dfSecondaryOutline}
                    onClick={() =>
                      setBowTie({
                        ...bowTie,
                        threats: bowTie.threats.filter((_, i) => i !== tIdx),
                      })
                    }
                  >
                    Remove threat
                  </button>
                </div>
              </fieldset>
            ))}
            <button
              type="button"
              className="min-h-11 touch-target rounded-md text-base font-semibold text-emerald-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              onClick={() =>
                setBowTie({
                  ...bowTie,
                  threats: [
                    ...bowTie.threats,
                    { description: "", preventiveBarriers: [] },
                  ],
                })
              }
            >
              Add threat scenario
            </button>
          </div>

          <div className="space-y-3 border-t border-zinc-200 pt-3">
            <p className={`text-sm font-medium text-zinc-800`}>Consequences / mitigative side</p>
            {bowTie.consequences.map((cons, cIdx) => (
              <fieldset
                key={`cons-${cIdx}`}
                className="space-y-2 rounded border border-zinc-200 bg-white p-3"
              >
                <legend className="sr-only">Consequence {cIdx + 1}</legend>
                <p className={`${dfHelperXs} font-medium text-zinc-800`}>Consequence {cIdx + 1}</p>
                <textarea
                  aria-label={`Consequence ${cIdx + 1} description`}
                  rows={2}
                  value={cons.description}
                  onChange={(e) => {
                    const consequences = bowTie.consequences.map((co, i) =>
                      i === cIdx ? { ...co, description: e.target.value } : co,
                    );
                    setBowTie({ ...bowTie, consequences });
                  }}
                  className={dfControl}
                  placeholder="Consequence from the top event…"
                />
                <p className={dfHelperXs}>Mitigative barriers</p>
                {cons.mitigativeBarriers.map((bar, bIdx) => (
                  <div key={bIdx} className="flex flex-wrap items-end gap-2">
                    <div className={`min-w-[12rem] flex-1`}>
                      <label className="sr-only" htmlFor={`bt-co-${cIdx}-bar-${bIdx}-desc`}>
                        Mitigative barrier {bIdx + 1} description
                      </label>
                      <input
                        id={`bt-co-${cIdx}-bar-${bIdx}-desc`}
                        value={bar.description}
                        onChange={(e) => {
                          const consequences = bowTie.consequences.map((co, ci) => {
                            if (ci !== cIdx) return co;
                            return {
                              ...co,
                              mitigativeBarriers: co.mitigativeBarriers.map((mb, mi) =>
                                mi === bIdx ? { ...mb, description: e.target.value } : mb,
                              ),
                            };
                          });
                          setBowTie({ ...bowTie, consequences });
                        }}
                        className={dfControl}
                        placeholder="Barrier…"
                      />
                    </div>
                    <div>
                      <label className="sr-only" htmlFor={`bt-co-${cIdx}-bar-${bIdx}-out`}>
                        Outcome
                      </label>
                      <select
                        id={`bt-co-${cIdx}-bar-${bIdx}-out`}
                        value={bar.outcome}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!isBowTieBarrierOutcome(v)) return;
                          const consequences = bowTie.consequences.map((co, ci) => {
                            if (ci !== cIdx) return co;
                            return {
                              ...co,
                              mitigativeBarriers: co.mitigativeBarriers.map((mb, mi) =>
                                mi === bIdx ? { ...mb, outcome: v } : mb,
                              ),
                            };
                          });
                          setBowTie({ ...bowTie, consequences });
                        }}
                        className={`${dfControl} min-w-[10rem]`}
                      >
                        {bowTieBarrierOutcomeEnum.map((o) => (
                          <option key={o} value={o}>
                            {BARRIER_OUTCOME_LABELS[o]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className={dfSecondaryOutline}
                      onClick={() => {
                        const consequences = bowTie.consequences.map((co, ci) =>
                          ci !== cIdx
                            ? co
                            : {
                                ...co,
                                mitigativeBarriers: co.mitigativeBarriers.filter((_, bi) => bi !== bIdx),
                              },
                        );
                        setBowTie({ ...bowTie, consequences });
                      }}
                    >
                      Remove barrier
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={dfSecondaryOutline}
                    onClick={() => {
                      const consequences = bowTie.consequences.map((co, ci) =>
                        ci !== cIdx
                          ? co
                          : {
                              ...co,
                              mitigativeBarriers: [
                                ...co.mitigativeBarriers,
                                { description: "", outcome: "unknown" as const },
                              ],
                            },
                      );
                      setBowTie({ ...bowTie, consequences });
                    }}
                  >
                    Add mitigative barrier
                  </button>
                  <button
                    type="button"
                    className={dfSecondaryOutline}
                    onClick={() =>
                      setBowTie({
                        ...bowTie,
                        consequences: bowTie.consequences.filter((_, i) => i !== cIdx),
                      })
                    }
                  >
                    Remove consequence
                  </button>
                </div>
              </fieldset>
            ))}
            <button
              type="button"
              className="min-h-11 touch-target rounded-md text-base font-semibold text-emerald-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              onClick={() =>
                setBowTie({
                  ...bowTie,
                  consequences: [
                    ...bowTie.consequences,
                    { description: "", mitigativeBarriers: [] },
                  ],
                })
              }
            >
              Add consequence scenario
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-md border border-zinc-100 bg-zinc-50/80 p-4">
          <h4 className={`text-sm font-semibold text-zinc-900`}>Event sequence</h4>
          <p className={dfHelperXs}>
            Order matters. Optional time-of-step for each entry (local time as captured in the browser).
          </p>
          {chronology.map((row, idx) => (
            <div
              key={idx}
              className="space-y-2 rounded border border-zinc-200 bg-white p-3"
            >
              <p className={`${dfHelperXs} font-medium text-zinc-800`}>Step {idx + 1}</p>
              <div>
                <label className={dfLabel} htmlFor={`chr-time-${idx}`}>
                  Time (optional)
                </label>
                <input
                  id={`chr-time-${idx}`}
                  type="datetime-local"
                  value={row.occurredAtInput}
                  onChange={(e) => {
                    setChronology(
                      chronology.map((r, i) => (i === idx ? { ...r, occurredAtInput: e.target.value } : r)),
                    );
                  }}
                  className={dfControlMt}
                />
              </div>
              <div>
                <label className={dfLabel} htmlFor={`chr-desc-${idx}`}>
                  What happened
                </label>
                <textarea
                  id={`chr-desc-${idx}`}
                  rows={2}
                  value={row.description}
                  onChange={(e) => {
                    setChronology(
                      chronology.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r)),
                    );
                  }}
                  className={dfControlMt}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={dfSecondaryOutline}
                  disabled={idx === 0}
                  onClick={() => {
                    if (idx === 0) return;
                    const next = [...chronology];
                    [next[idx - 1], next[idx]] = [next[idx]!, next[idx - 1]!];
                    setChronology(next);
                  }}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className={dfSecondaryOutline}
                  disabled={idx >= chronology.length - 1}
                  onClick={() => {
                    if (idx >= chronology.length - 1) return;
                    const next = [...chronology];
                    [next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!];
                    setChronology(next);
                  }}
                >
                  Move down
                </button>
                <button
                  type="button"
                  className={dfSecondaryOutline}
                  onClick={() => {
                    const next = chronology.filter((_, i) => i !== idx);
                    setChronology(next.length === 0 ? [{ occurredAtInput: "", description: "" }] : next);
                  }}
                >
                  Remove step
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className={dfSecondaryOutline}
            onClick={() =>
              setChronology([...chronology, { occurredAtInput: "", description: "" }])
            }
          >
            Add event step
          </button>
        </div>

        <div className="space-y-3 rounded-md border border-zinc-100 bg-zinc-50/80 p-4">
          <h4 className={`text-sm font-semibold text-zinc-900`}>Causal factors</h4>
          <p className={dfHelperXs}>
            Summarize factors and optional defenses or barriers that did not hold (short labels).
          </p>
          {causalFactors.map((row, idx) => (
            <div key={idx} className="space-y-2 rounded border border-zinc-200 bg-white p-3">
              <div>
                <label className={dfLabel} htmlFor={`cf-sum-${idx}`}>
                  Summary
                </label>
                <textarea
                  id={`cf-sum-${idx}`}
                  rows={2}
                  value={row.summary}
                  onChange={(e) => {
                    setCausalFactors(
                      causalFactors.map((r, i) => (i === idx ? { ...r, summary: e.target.value } : r)),
                    );
                  }}
                  className={dfControlMt}
                />
              </div>
              <div>
                <label className={dfLabel} htmlFor={`cf-cat-${idx}`}>
                  Category (optional)
                </label>
                <select
                  id={`cf-cat-${idx}`}
                  value={row.category}
                  onChange={(e) => {
                    setCausalFactors(
                      causalFactors.map((r, i) =>
                        i === idx ? { ...r, category: e.target.value } : r,
                      ),
                    );
                  }}
                  className={dfControlMt}
                >
                  <option value="">—</option>
                  {causalFactorCategoryEnum.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className={dfHelperXs}>Barriers or defenses failed (optional)</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {row.barriersFailed.map((bf, bfi) => (
                    <span
                      key={`${bf}-${bfi}`}
                      className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2 py-1 text-xs text-zinc-900"
                    >
                      {bf}
                      <button
                        type="button"
                        aria-label={`Remove ${bf}`}
                        className="font-bold"
                        onClick={() => {
                          setCausalFactors(
                            causalFactors.map((r, i) =>
                              i === idx
                                ? {
                                    ...r,
                                    barriersFailed: r.barriersFailed.filter((_, j) => j !== bfi),
                                  }
                                : r,
                            ),
                          );
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <CausalBarrierFailedAddRow
                  rowIndex={idx}
                  onAdd={(label) => {
                    const v = label.trim();
                    if (!v || row.barriersFailed.includes(v) || row.barriersFailed.length >= 10) return;
                    setCausalFactors(
                      causalFactors.map((r, i) =>
                        i === idx ? { ...r, barriersFailed: [...r.barriersFailed, v] } : r,
                      ),
                    );
                  }}
                />
              </div>
              <button
                type="button"
                className={dfSecondaryOutline}
                onClick={() => setCausalFactors(causalFactors.filter((_, i) => i !== idx))}
              >
                Remove causal factor row
              </button>
            </div>
          ))}
          <button
            type="button"
            className={dfSecondaryOutline}
            onClick={() =>
              setCausalFactors([
                ...causalFactors,
                { summary: "", category: "", barriersFailed: [] },
              ])
            }
          >
            Add causal factor
          </button>
        </div>
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
  const [reopenNotes, setReopenNotes] = useState("");
  const [showReopen, setShowReopen] = useState(false);

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
    onSuccess: (_data, variables) => {
      void utils.incident.get.invalidate({ organizationId: organizationId!, incidentId });
      void utils.incident.list.invalidate();
      setError(null);
      setShowClose(false);
      setClosureNotes("");
      setShowReopen(false);
      setReopenNotes("");
      if (variables.status === "closed") {
        router.push("/dashboard/incidents");
      }
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
          <dl className="mt-2 space-y-1 text-sm text-zinc-600">
            <div>
              <dt className="inline font-medium text-zinc-700 after:content-[':']">Recorded</dt>{" "}
              <dd className="inline">
                <time dateTime={new Date(incident.createdAt).toISOString()}>
                  {new Date(incident.createdAt).toLocaleString()}
                </time>
              </dd>
              <span className={`${dfHelperXs} ml-1`}>(first saved in this system)</span>
            </div>
            <div>
              <dt className="inline font-medium text-zinc-700 after:content-[':']">Occurred</dt>{" "}
              <dd className="inline">
                {incident.occurredAt ? (
                  <time dateTime={new Date(incident.occurredAt).toISOString()}>
                    {new Date(incident.occurredAt).toLocaleString()}
                  </time>
                ) : (
                  <span className="text-zinc-500">
                    {canSeeNarrative
                      ? "Not set — add under Record details"
                      : "Not set"}
                  </span>
                )}
              </dd>
            </div>
          </dl>
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

      <IncidentRelatedCapasSection organizationId={organizationId} incidentId={incidentId} />

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
          {incident.status === "closed" && incident.canAdminReopenIncident ? (
            <button
              type="button"
              className={`${dfSecondaryOutline} min-h-11`}
              onClick={() => {
                setError(null);
                setShowReopen(true);
              }}
            >
              Reopen incident (admin)
            </button>
          ) : null}
        </div>
        <p className={`mt-2 ${dfHelperXs}`}>
          Incidents must move to <strong>investigating</strong> before closure. Closing requires a
          root cause summary and a closure justification (recorded in the audit trail).
          {incident.canAdminReopenIncident ? (
            <>
              {" "}
              Organization administrators can reopen a closed incident to{" "}
              <strong>investigating</strong> with a written justification (audit-logged).
            </>
          ) : null}
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

      {showReopen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reopen-incident-title"
        >
          <div className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white p-6 shadow-lg">
            <h2 id="reopen-incident-title" className="text-lg font-semibold text-zinc-900">
              Reopen incident
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Moves this record back to <strong>investigating</strong>. Explain why (minimum 20
              characters). This is stored in the audit log. Requires organization administrator
              permission.
            </p>
            <textarea
              className={`mt-3 min-h-[6rem] ${dfControl}`}
              value={reopenNotes}
              onChange={(e) => setReopenNotes(e.target.value)}
              placeholder="e.g. Regulatory inquiry requires supplemental RCA documentation…"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={dfPrimarySubmit}
                disabled={updateStatus.isPending || reopenNotes.trim().length < 20}
                aria-busy={updateStatus.isPending}
                onClick={() => {
                  setError(null);
                  updateStatus.mutate({
                    organizationId,
                    incidentId,
                    status: "investigating",
                    reopenJustification: reopenNotes.trim(),
                  });
                }}
              >
                Confirm reopen
              </button>
              <button
                type="button"
                className={dfSecondaryOutline}
                onClick={() => {
                  setShowReopen(false);
                  setReopenNotes("");
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

      <IncidentLinkedCapaSection
        organizationId={organizationId}
        incidentId={incidentId}
        linkedCapas={linkedCapas}
      />
    </div>
  );
}
