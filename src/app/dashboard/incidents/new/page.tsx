"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { IntakePhotoAttachments } from "@/components/field/intake-photo-attachments";
import { useNavigatorOnline } from "@/hooks/useNavigatorOnline";
import { usePersistedFormDraft } from "@/hooks/usePersistedFormDraft";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  buildFieldPhotoAppendix,
  type CompressedIntakeImage,
  wouldExceedIntakeTextLimit,
} from "@/lib/field/compressIntakeImage";
import { enqueueFieldOutbox, isFieldOutboxEnabled } from "@/lib/offline/fieldOutbox";
import { trpc } from "@/trpc/react";
import { INCIDENT_SEVERITIES, INCIDENT_TYPES } from "@/lib/ehs-enums";

const severities = INCIDENT_SEVERITIES;

function formatTypeLabel(t: (typeof INCIDENT_TYPES)[number]): string {
  return t.replaceAll("_", " ");
}

type IncidentDraft = {
  title: string;
  description: string;
  severity: string;
  incidentType: string;
  siteId: string;
  occurredAtLocal: string;
  immediateActions: string;
  regulatoryNotificationRequired: string;
};

const emptyDraft: IncidentDraft = {
  title: "",
  description: "",
  severity: severities[1] ?? "medium",
  incidentType: INCIDENT_TYPES[2] ?? "near_miss",
  siteId: "",
  occurredAtLocal: "",
  immediateActions: "",
  regulatoryNotificationRequired: "false",
};

export default function NewIncidentPage() {
  const router = useRouter();
  const formId = useId();
  const formErrorId = useId();
  const offlineHintId = useId();
  const outboxAnnounceId = useId();
  const suggestErrorId = useId();
  const draftRestoredId = useId();
  const online = useNavigatorOnline();
  const { organizationId } = useOrg();
  const utils = trpc.useUtils();

  const draftStorageKey = organizationId ? `ehs:draft:incident:new:${organizationId}` : null;
  const { draft, setDraftField, restored, clearDraft } = usePersistedFormDraft<IncidentDraft>(
    draftStorageKey,
    emptyDraft,
  );

  const severity = severities.includes(draft.severity as (typeof severities)[number])
    ? (draft.severity as (typeof severities)[number])
    : (severities[1] ?? "medium");
  const incidentType = INCIDENT_TYPES.includes(draft.incidentType as (typeof INCIDENT_TYPES)[number])
    ? (draft.incidentType as (typeof INCIDENT_TYPES)[number])
    : (INCIDENT_TYPES[2] ?? "near_miss");

  const { data: sites } = trpc.organization.sites.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const [error, setError] = useState<string | null>(null);
  const [outboxStatus, setOutboxStatus] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [intakePhotos, setIntakePhotos] = useState<CompressedIntakeImage[]>([]);

  const contextHint = [draft.title.trim(), draft.description.trim(), draft.immediateActions.trim()]
    .filter(Boolean)
    .join("\n")
    .trim();

  const create = trpc.incident.create.useMutation({
    onSuccess: (created) => {
      clearDraft();
      void utils.incident.list.invalidate();
      router.push(`/dashboard/incidents/${created.id}`);
    },
    onError: (e) => setError(e.message),
  });

  const suggestDraft = trpc.aiAssistant.proposeIncidentIntakeDraft.useMutation({
    onSuccess: (out) => {
      setDraftField("title", out.suggestedTitle);
      setDraftField("description", out.suggestedDescription);
      if (out.suggestedImmediateActions) {
        setDraftField("immediateActions", out.suggestedImmediateActions);
      }
      if (out.suggestedSeverity) setDraftField("severity", out.suggestedSeverity);
      if (out.suggestedIncidentType) setDraftField("incidentType", out.suggestedIncidentType);
      setSuggestError(null);
    },
    onError: (e) => setSuggestError(e.message),
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Report incident</h1>
        <OrgSwitcher />
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!organizationId) return;
    setError(null);
    if (!draft.title.trim() || !draft.description.trim()) {
      setError("Title and what happened are required.");
      return;
    }
    if (!online && intakePhotos.length > 0) {
      setError(
        "Photos cannot be saved with an offline queued report. Remove photos or connect to the network.",
      );
      return;
    }
    let occurredAt: Date | undefined;
    if (draft.occurredAtLocal.trim()) {
      const d = new Date(draft.occurredAtLocal);
      if (!Number.isNaN(d.getTime())) occurredAt = d;
    }
    const photoAppendix = buildFieldPhotoAppendix(intakePhotos);
    let descriptionOut = draft.description;
    if (photoAppendix) {
      if (wouldExceedIntakeTextLimit(draft.description, photoAppendix)) {
        setError(
          "Your description and photos together exceed the server limit. Remove a photo or shorten the text.",
        );
        return;
      }
      descriptionOut = `${draft.description}${photoAppendix}`;
    }
    const regulatoryNotificationRequired = draft.regulatoryNotificationRequired === "true";
    const payload = {
      organizationId,
      title: draft.title,
      description: descriptionOut,
      severity,
      incidentType,
      siteId: draft.siteId || undefined,
      occurredAt: occurredAt?.toISOString(),
      immediateActions: draft.immediateActions.trim() || undefined,
      regulatoryNotificationRequired: regulatoryNotificationRequired || undefined,
    };

    if (!online) {
      if (isFieldOutboxEnabled()) {
        setOutboxStatus(null);
        try {
          await enqueueFieldOutbox({
            procedure: "incident.create",
            organizationId,
            payloadJson: JSON.stringify(payload),
          });
          setOutboxStatus("Saved in this browser. It will send when you are back online.");
        } catch {
          setError("Could not save offline draft in this browser.");
        }
      }
      return;
    }

    create.mutate({
      ...payload,
      description: descriptionOut,
      severity,
      incidentType,
      occurredAt,
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Report incident</h1>
        <OrgSwitcher />
      </div>
      <form
        id={formId}
        noValidate
        suppressHydrationWarning
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
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
        <p className="text-sm text-zinc-600">
          Use short phrases if you are in a hurry — you can refine details from the incident record
          after submitting.
        </p>
        <div className="flex flex-wrap gap-2" data-stress-action-region="capture-ai">
          <button
            type="button"
            className="btn-secondary"
            disabled={suggestDraft.isPending || contextHint.length < 10}
            aria-busy={suggestDraft.isPending}
            onClick={() => {
              if (!organizationId) return;
              setSuggestError(null);
              suggestDraft.mutate({ organizationId, contextHint });
            }}
          >
            {suggestDraft.isPending ? "Suggesting..." : "Suggest wording (AI)"}
          </button>
          <span className="self-center text-sm text-text-muted">
            Proposal only — edit before saving. Requires AI and RAG permissions.
          </span>
        </div>
        {suggestError ? (
          <p id={suggestErrorId} role="alert" className="text-sm text-danger">
            {suggestError}
          </p>
        ) : null}
        <div>
          <label htmlFor={`${formId}-itype`} className="block text-sm font-medium">
            Event type
          </label>
          <select
            id={`${formId}-itype`}
            value={incidentType}
            onChange={(e) => setDraftField("incidentType", e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
          >
            {INCIDENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatTypeLabel(t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${formId}-site`} className="block text-sm font-medium">
            Site / location
          </label>
          <select
            id={`${formId}-site`}
            value={draft.siteId}
            onChange={(e) => setDraftField("siteId", e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
          >
            <option value="">— Not specified —</option>
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {!sites?.length ? (
            <p className="mt-1 text-xs text-glare-muted">
              No sites on file for this org yet — intake can continue without a site.
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor={`${formId}-when`} className="block text-sm font-medium">
            When it occurred (optional)
          </label>
          <input
            id={`${formId}-when`}
            type="datetime-local"
            value={draft.occurredAtLocal}
            onChange={(e) => setDraftField("occurredAtLocal", e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor={`${formId}-title`} className="block text-sm font-medium">
            Title
          </label>
          <input
            id={`${formId}-title`}
            required
            value={draft.title}
            onChange={(e) => setDraftField("title", e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? formErrorId : undefined}
            className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor={`${formId}-desc`} className="block text-sm font-medium">
            What happened
          </label>
          <textarea
            id={`${formId}-desc`}
            required
            placeholder="Where, equipment/area, people involved, immediate outcome (bullets OK)"
            rows={4}
            value={draft.description}
            onChange={(e) => setDraftField("description", e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? formErrorId : undefined}
            className="mt-1 min-h-[6rem] w-full rounded-md border border-zinc-300 px-3 py-3 text-base text-zinc-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor={`${formId}-immediate`} className="block text-sm font-medium">
            Immediate actions (optional)
          </label>
          <textarea
            id={`${formId}-immediate`}
            rows={2}
            value={draft.immediateActions}
            onChange={(e) => setDraftField("immediateActions", e.target.value)}
            placeholder="Barricade, first aid, shutoff, notify supervisor…"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-normal text-zinc-800">
          <input
            type="checkbox"
            checked={draft.regulatoryNotificationRequired === "true"}
            onChange={(e) =>
              setDraftField("regulatoryNotificationRequired", e.target.checked ? "true" : "false")
            }
          />
          Regulatory notification may be required
        </label>
        <IntakePhotoAttachments
          images={intakePhotos}
          onChange={setIntakePhotos}
          disabled={create.isPending}
        />
        <p className="text-xs text-glare-muted">
          Photos are not stored in the local draft — they stay in memory until you submit.
        </p>
        <div>
          <label htmlFor={`${formId}-sev`} className="block text-sm font-medium">
            Severity
          </label>
          <select
            id={`${formId}-sev`}
            value={severity}
            onChange={(e) => setDraftField("severity", e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? formErrorId : undefined}
            className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
          >
            {severities.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {!online ? (
          <p id={offlineHintId} role="status" className="text-base font-medium text-amber-900">
            {isFieldOutboxEnabled()
              ? "You appear offline — you can queue this report on this device. It sends when you are back online."
              : "You are offline. Connect to the network before submitting — the report cannot be saved while offline."}
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
        {error ? (
          <p id={formErrorId} className="text-base text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3" data-stress-action-region="capture-create">
          <button
            type="submit"
            disabled={create.isPending || (!online && !isFieldOutboxEnabled())}
            aria-busy={create.isPending}
            aria-describedby={
              [
                !online ? offlineHintId : "",
                error ? formErrorId : "",
                outboxStatus ? outboxAnnounceId : "",
                restored ? draftRestoredId : "",
              ]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className="btn-primary touch-target min-h-11"
          >
            {create.isPending ? "Saving…" : "Submit"}
          </button>
          <Link href="/dashboard/incidents" className="btn-secondary">
            Cancel
          </Link>
        </div>
        <p className="text-xs text-glare-muted">
          After submit, open the incident to start investigation, add root cause, and close only when
          requirements are met.
        </p>
      </form>
    </div>
  );
}
