"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useNavigatorOnline } from "@/hooks/useNavigatorOnline";
import { usePersistedFormDraft } from "@/hooks/usePersistedFormDraft";
import { IntakePhotoAttachments } from "@/components/field/intake-photo-attachments";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfLabel,
  dfMuted,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import {
  enqueueFieldOutbox,
  isFieldOutboxEnabled,
} from "@/lib/offline/fieldOutbox";
import {
  buildFieldPhotoAppendix,
  type CompressedIntakeImage,
  wouldExceedIntakeTextLimit,
} from "@/lib/field/compressIntakeImage";
import { trpc } from "@/trpc/react";

const inputClass =
  "mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm";

const categories = ["positive_behavior", "at_risk_behavior", "unsafe_condition", "other"] as const;
const severities = ["low", "medium", "high", "critical"] as const;

type ObsDraft = {
  summary: string;
  details: string;
  category: string;
  severity: string;
  siteId: string;
  observedAt: string;
};

const emptyDraft: ObsDraft = {
  summary: "",
  details: "",
  category: "other",
  severity: "medium",
  siteId: "",
  observedAt: "",
};

export default function NewObservationPage() {
  const router = useRouter();
  const formId = useId();
  const offlineHintId = useId();
  const draftRestoredId = useId();
  const outboxAnnounceId = useId();
  const suggestErrorId = useId();
  const online = useNavigatorOnline();
  const { organizationId } = useOrg();

  const [outboxStatus, setOutboxStatus] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [intakePhotos, setIntakePhotos] = useState<CompressedIntakeImage[]>([]);
  const [intakeError, setIntakeError] = useState<string | null>(null);

  const draftStorageKey = organizationId ? `ehs:draft:observation:new:${organizationId}` : null;
  const { draft, setDraftField, restored, clearDraft } = usePersistedFormDraft<ObsDraft>(
    draftStorageKey,
    emptyDraft,
  );

  const category = categories.includes(draft.category as (typeof categories)[number])
    ? (draft.category as (typeof categories)[number])
    : "other";
  const severity = severities.includes(draft.severity as (typeof severities)[number])
    ? (draft.severity as (typeof severities)[number])
    : "medium";

  const { data: sites } = trpc.organization.sites.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const utils = trpc.useUtils();

  const create = trpc.observation.create.useMutation({
    onSuccess: (row) => {
      clearDraft();
      router.push(`/dashboard/observations/${row.id}`);
      void utils.observation.list.invalidate();
    },
  });

  const suggestDraft = trpc.aiAssistant.proposeObservationIntakeDraft.useMutation({
    onSuccess: (out) => {
      setDraftField("summary", out.suggestedSummary);
      if (out.suggestedDetails) setDraftField("details", out.suggestedDetails);
      setSuggestError(null);
    },
    onError: (e) => setSuggestError(e.message),
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Log observation</h1>
        <OrgSwitcher />
      </div>
    );
  }

  async function submitObservation(e: React.FormEvent) {
    e.preventDefault();
    if (!organizationId) return;
    setIntakeError(null);
    const orgId = organizationId;
    let obsDate: Date | undefined;
    if (draft.observedAt.trim()) {
      const d = new Date(`${draft.observedAt}T12:00:00`);
      if (!Number.isNaN(d.getTime())) obsDate = d;
    }
    if (!online && intakePhotos.length > 0) {
      setIntakeError(
        "Photos cannot be queued offline. Remove photos or connect to the network before saving.",
      );
      return;
    }
    const appendix = buildFieldPhotoAppendix(intakePhotos);
    const detailsBase = draft.details.trim() || "";
    let detailsOut: string | null = detailsBase || null;
    if (appendix) {
      if (wouldExceedIntakeTextLimit(detailsBase, appendix)) {
        setIntakeError(
          "Your notes and photos together exceed the server limit. Remove a photo or shorten the notes.",
        );
        return;
      }
      detailsOut = `${detailsBase}${appendix}` || null;
    }
    const payload = {
      organizationId: orgId,
      summary: draft.summary.trim(),
      details: detailsOut,
      category,
      severity,
      siteId: draft.siteId || null,
      observedAt: obsDate?.toISOString() ?? null,
    };

    if (!online) {
      if (isFieldOutboxEnabled()) {
        try {
          await enqueueFieldOutbox({
            procedure: "observation.create",
            organizationId: orgId,
            payloadJson: JSON.stringify(payload),
          });
          setOutboxStatus("Queued in this browser. It will send when you are back online.");
        } catch {
          setOutboxStatus("Could not queue offline observation in this browser.");
        }
      }
      return;
    }

    create.mutate({
      organizationId: orgId,
      summary: payload.summary,
      details: detailsOut,
      category,
      severity,
      siteId: payload.siteId ?? undefined,
      observedAt: obsDate,
    });
  }

  const contextHint = [draft.summary.trim(), draft.details.trim()].filter(Boolean).join("\n").trim();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={dfSectionHeading}>Log observation</h1>
          <p className={`mt-1 ${dfMuted}`}>Short headline first; add detail in Notes if needed.</p>
        </div>
        <OrgSwitcher />
      </div>

      <form
        id={formId}
        suppressHydrationWarning
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
        onSubmit={submitObservation}
      >
        {restored ? (
          <p id={draftRestoredId} role="status" aria-live="polite" className="text-sm text-zinc-800">
            Restored a draft from this browser. It is removed after a successful save.{" "}
            <button
              type="button"
              className="font-medium text-emerald-900 underline underline-offset-2"
              onClick={() => clearDraft()}
            >
              Discard draft
            </button>
          </p>
        ) : null}
        {!online ? (
          <p id={offlineHintId} role="status" className="text-base font-medium text-amber-900">
            {isFieldOutboxEnabled()
              ? "You appear offline — you can queue this observation on this device. It sends when you are back online."
              : "You are offline. Connect to submit — your notes stay in this browser as a draft until you save."}
          </p>
        ) : null}
        {outboxStatus ? (
          <p
            id={outboxAnnounceId}
            role="status"
            aria-live="polite"
            className="text-base font-medium text-emerald-900"
          >
            {outboxStatus}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={dfSecondaryOutline}
            disabled={suggestDraft.isPending || contextHint.length < 10}
            aria-busy={suggestDraft.isPending}
            onClick={() => {
              setSuggestError(null);
              suggestDraft.mutate({ organizationId, contextHint });
            }}
          >
            {suggestDraft.isPending ? "Suggesting…" : "Suggest wording (AI)"}
          </button>
          <span className={`self-center text-sm ${dfMuted}`}>
            Proposal only — edit before saving. Requires AI + RAG permissions.
          </span>
        </div>
        {suggestError ? (
          <p id={suggestErrorId} role="alert" className="text-sm text-red-700">
            {suggestError}
          </p>
        ) : null}
        {intakeError ? (
          <p role="alert" className="text-sm font-medium text-red-800">
            {intakeError}
          </p>
        ) : null}
        <div>
          <label className={dfLabel} htmlFor={`${formId}-sum`}>
            Summary
          </label>
          <input
            id={`${formId}-sum`}
            required
            minLength={2}
            className={inputClass}
            value={draft.summary}
            onChange={(e) => setDraftField("summary", e.target.value)}
            placeholder="e.g. Pedestrian briefly in crane swing radius"
            aria-invalid={suggestError ? true : undefined}
            aria-describedby={suggestError ? suggestErrorId : undefined}
          />
        </div>

        <div>
          <label className={dfLabel} htmlFor={`${formId}-cat`}>
            Category
          </label>
          <select
            id={`${formId}-cat`}
            className={inputClass}
            value={category}
            onChange={(e) => setDraftField("category", e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={dfLabel} htmlFor={`${formId}-sev`}>
            Severity
          </label>
          <select
            id={`${formId}-sev`}
            className={inputClass}
            value={severity}
            onChange={(e) => setDraftField("severity", e.target.value)}
          >
            {severities.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={dfLabel} htmlFor={`${formId}-site`}>
            Site (optional)
          </label>
          <select
            id={`${formId}-site`}
            className={inputClass}
            value={draft.siteId}
            onChange={(e) => setDraftField("siteId", e.target.value)}
          >
            <option value="">Not specified</option>
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={dfLabel} htmlFor={`${formId}-when`}>
            Observed date (optional — defaults now)
          </label>
          <input
            id={`${formId}-when`}
            type="date"
            className={inputClass}
            value={draft.observedAt}
            onChange={(e) => setDraftField("observedAt", e.target.value)}
          />
        </div>

        <div>
          <label className={dfLabel} htmlFor={`${formId}-det`}>
            Notes (optional)
          </label>
          <textarea
            id={`${formId}-det`}
            rows={4}
            className={`${inputClass} min-h-[6rem]`}
            value={draft.details}
            onChange={(e) => setDraftField("details", e.target.value)}
          />
        </div>

        <IntakePhotoAttachments
          images={intakePhotos}
          onChange={setIntakePhotos}
          disabled={create.isPending}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className={dfPrimarySubmit}
            disabled={create.isPending || (!online && !isFieldOutboxEnabled())}
            aria-busy={create.isPending}
            aria-describedby={
              [
                !online ? offlineHintId : "",
                restored ? draftRestoredId : "",
                outboxStatus ? outboxAnnounceId : "",
              ]
                .filter(Boolean)
                .join(" ") || undefined
            }
          >
            Save observation
          </button>
          <Link
            href="/dashboard/observations"
            className="inline-flex min-h-11 touch-target items-center rounded-md border border-zinc-300 px-4 py-2 text-base text-zinc-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
