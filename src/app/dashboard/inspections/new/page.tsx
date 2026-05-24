"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useNavigatorOnline } from "@/hooks/useNavigatorOnline";
import { usePersistedJsonDraft } from "@/hooks/usePersistedJsonDraft";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfLabel,
  dfMuted,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { IntakePhotoAttachments } from "@/components/field/intake-photo-attachments";
import {
  buildFieldPhotoAppendix,
  type CompressedIntakeImage,
  wouldExceedIntakeTextLimit,
} from "@/lib/field/compressIntakeImage";
import { enqueueFieldOutbox, isFieldOutboxEnabled } from "@/lib/offline/fieldOutbox";
import { trpc } from "@/trpc/react";

const inputClass =
  "mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm";

const inspectionTypeValues = ["routine", "regulatory", "pre_job", "other"] as const;
type InspectionType = (typeof inspectionTypeValues)[number];

type InspectionDraft = {
  title: string;
  inspectionType: InspectionType;
  scheduledAt: string;
  notes: string;
};

const initialInspectionDraft = (): InspectionDraft => ({
  title: "",
  inspectionType: "other",
  scheduledAt: "",
  notes: "",
});

export default function NewInspectionPage() {
  const router = useRouter();
  const formId = useId();
  const online = useNavigatorOnline();
  const { organizationId } = useOrg();
  const draftKey = organizationId
    ? `ehs:draft:inspection:new:${organizationId}`
    : "ehs:draft:inspection:new:pending";
  const { draft, setDraftField, clearDraft } = usePersistedJsonDraft<InspectionDraft>(
    draftKey,
    initialInspectionDraft(),
  );
  const title = draft.title;
  const inspectionType = draft.inspectionType;
  const scheduledAt = draft.scheduledAt;
  const notes = draft.notes;
  const setTitle = (v: string) => setDraftField("title", v);
  const setInspectionType = (v: InspectionType) => setDraftField("inspectionType", v);
  const setScheduledAt = (v: string) => setDraftField("scheduledAt", v);
  const setNotes = (v: string) => setDraftField("notes", v);
  const [outboxStatus, setOutboxStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [intakePhotos, setIntakePhotos] = useState<CompressedIntakeImage[]>([]);

  const contextHint = [title.trim(), notes.trim()].filter(Boolean).join("\n").trim();

  const utils = trpc.useUtils();
  const create = trpc.inspection.create.useMutation({
    onSuccess: (row) => {
      clearDraft();
      void utils.inspection.list.invalidate();
      router.push(`/dashboard/inspections/${row.id}`);
    },
    onError: (e) => setError(e.message),
  });

  const suggestDraft = trpc.aiAssistant.proposeInspectionIntakeDraft.useMutation({
    onSuccess: (out) => {
      setTitle(out.suggestedTitle);
      if (out.suggestedNotes) setNotes(out.suggestedNotes);
      if (out.suggestedInspectionType) setInspectionType(out.suggestedInspectionType);
      setSuggestError(null);
    },
    onError: (e) => setSuggestError(e.message),
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">New inspection</h1>
        <OrgSwitcher />
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!organizationId) return;
    setError(null);
    if (!online && intakePhotos.length > 0) {
      setError(
        "Photos cannot be saved with an offline queued inspection. Remove photos or connect to the network.",
      );
      return;
    }
    let sched: Date | undefined;
    if (scheduledAt.trim()) {
      const d = new Date(`${scheduledAt}T12:00:00`);
      if (!Number.isNaN(d.getTime())) sched = d;
    }
    const appendix = buildFieldPhotoAppendix(intakePhotos);
    const notesBase = notes.trim();
    let notesOut: string | null = notesBase || null;
    if (appendix) {
      if (wouldExceedIntakeTextLimit(notesBase, appendix)) {
        setError(
          "Your notes and photos together exceed the server limit. Remove a photo or shorten the notes.",
        );
        return;
      }
      notesOut = `${notesBase}${appendix}` || null;
    }
    const payload = {
      organizationId,
      title: title.trim(),
      inspectionType,
      scheduledAt: sched?.toISOString() ?? null,
      notes: notesOut,
    };

    if (!online) {
      if (isFieldOutboxEnabled()) {
        setOutboxStatus(null);
        try {
          await enqueueFieldOutbox({
            procedure: "inspection.create",
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
      organizationId,
      title: payload.title,
      inspectionType: payload.inspectionType,
      scheduledAt: sched,
      notes: notesOut ?? undefined,
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={dfSectionHeading}>New inspection</h1>
          <p className={`mt-1 ${dfMuted}`}>
            Schedule a workplace inspection. You can update status and notes from the record page.
          </p>
        </div>
        <OrgSwitcher />
      </div>

      {outboxStatus ? (
        <p role="status" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {outboxStatus}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <button
          type="button"
          className={dfSecondaryOutline}
          disabled={suggestDraft.isPending || contextHint.length < 10}
          aria-busy={suggestDraft.isPending}
          onClick={() => {
            if (!organizationId) return;
            setSuggestError(null);
            suggestDraft.mutate({ organizationId, contextHint });
          }}
        >
          {suggestDraft.isPending ? "Suggesting…" : "Suggest wording (AI)"}
        </button>
        <span className="text-sm text-zinc-600">
          Proposal only — edit before saving. Requires AI and RAG permissions.
        </span>
      </div>
      {suggestError ? (
        <p role="alert" className="text-sm text-red-700">
          {suggestError}
        </p>
      ) : null}

      <form
        id={formId}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
        onSubmit={onSubmit}
      >
        <div>
          <label className={dfLabel} htmlFor={`${formId}-title`}>
            Title
          </label>
          <input
            id={`${formId}-title`}
            required
            minLength={2}
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className={dfLabel} htmlFor={`${formId}-type`}>
            Type
          </label>
          <select
            id={`${formId}-type`}
            className={inputClass}
            value={inspectionType}
            onChange={(e) => setInspectionType(e.target.value as InspectionType)}
          >
            {inspectionTypeValues.map((t) => (
              <option key={t} value={t}>
                {t === "pre_job" ? "Pre-job" : t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={dfLabel} htmlFor={`${formId}-sched`}>
            Scheduled date (optional)
          </label>
          <input
            id={`${formId}-sched`}
            type="date"
            className={inputClass}
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
        <div>
          <label className={dfLabel} htmlFor={`${formId}-notes`}>
            Notes (optional)
          </label>
          <textarea
            id={`${formId}-notes`}
            rows={3}
            className={inputClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
          >
            {create.isPending ? "Saving…" : "Create"}
          </button>
          <Link href="/dashboard/inspections" className={dfSecondaryOutline}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
