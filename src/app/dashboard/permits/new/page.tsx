"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useNavigatorOnline } from "@/hooks/useNavigatorOnline";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfLabel,
  dfMuted,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { enqueueFieldOutbox, isFieldOutboxEnabled } from "@/lib/offline/fieldOutbox";
import { trpc } from "@/trpc/react";

const inputClass =
  "mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm";

const types = ["hot_work", "confined_space", "work_at_height", "other"] as const;

export default function NewPermitPage() {
  const router = useRouter();
  const formId = useId();
  const { organizationId } = useOrg();
  const online = useNavigatorOnline();
  const [title, setTitle] = useState("");
  const [permitType, setPermitType] = useState<(typeof types)[number]>("other");
  const [siteId, setSiteId] = useState<string>("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [hazardsControls, setHazardsControls] = useState("");
  const [outboxStatus, setOutboxStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const contextHint = [title.trim(), workSummary.trim(), hazardsControls.trim()]
    .filter(Boolean)
    .join("\n")
    .trim();

  const { data: sites } = trpc.organization.sites.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const utils = trpc.useUtils();
  const create = trpc.permit.create.useMutation({
    onSuccess: (row) => {
      void utils.permit.list.invalidate();
      router.push(`/dashboard/permits/${row.id}`);
    },
    onError: (e) => setError(e.message),
  });

  const suggestDraft = trpc.aiAssistant.proposePermitIntakeDraft.useMutation({
    onSuccess: (out) => {
      setTitle(out.suggestedTitle);
      setWorkSummary(out.suggestedWorkSummary);
      if (out.suggestedHazardsControls) setHazardsControls(out.suggestedHazardsControls);
      if (out.suggestedPermitType) setPermitType(out.suggestedPermitType);
      setSuggestError(null);
    },
    onError: (e) => setSuggestError(e.message),
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">New permit</h1>
        <OrgSwitcher />
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!organizationId) return;
    setError(null);
    if (!validFrom.trim() || !validTo.trim()) return;
    const vf = new Date(`${validFrom}T08:00:00`);
    const vt = new Date(`${validTo}T17:00:00`);
    const payload = {
      organizationId,
      title: title.trim(),
      permitType,
      siteId: siteId || null,
      validFrom: vf.toISOString(),
      validTo: vt.toISOString(),
      workSummary: workSummary.trim(),
      hazardsControls: hazardsControls.trim() || null,
    };

    if (!online) {
      if (isFieldOutboxEnabled()) {
        setOutboxStatus(null);
        try {
          await enqueueFieldOutbox({
            procedure: "permit.create",
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
      permitType,
      siteId: payload.siteId ?? undefined,
      validFrom: vf,
      validTo: vt,
      workSummary: payload.workSummary,
      hazardsControls: payload.hazardsControls ?? undefined,
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={dfSectionHeading}>New work permit</h1>
          <p className={`mt-1 ${dfMuted}`}>Save as draft, then submit with approvers from the record page.</p>
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
          Proposal only — edit dates and site before saving. Requires AI and RAG permissions.
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
            Permit type
          </label>
          <select
            id={`${formId}-type`}
            className={inputClass}
            value={permitType}
            onChange={(e) => setPermitType(e.target.value as (typeof types)[number])}
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t.replaceAll("_", " ")}
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
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
          >
            <option value="">Not specified</option>
            {sites?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={dfLabel} htmlFor={`${formId}-vf`}>
              Valid from (date)
            </label>
            <input
              id={`${formId}-vf`}
              type="date"
              required
              className={inputClass}
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />
          </div>
          <div>
            <label className={dfLabel} htmlFor={`${formId}-vt`}>
              Valid to (date)
            </label>
            <input
              id={`${formId}-vt`}
              type="date"
              required
              className={inputClass}
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={dfLabel} htmlFor={`${formId}-work`}>
            Work summary <span className="text-red-700">*</span>
          </label>
          <textarea
            id={`${formId}-work`}
            required
            rows={4}
            className={`${inputClass} min-h-[6rem]`}
            value={workSummary}
            onChange={(e) => setWorkSummary(e.target.value)}
            placeholder="What work is authorized, equipment, isolation needs…"
          />
        </div>

        <div>
          <label className={dfLabel} htmlFor={`${formId}-hz`}>
            Hazards &amp; controls (optional)
          </label>
          <textarea
            id={`${formId}-hz`}
            rows={3}
            className={`${inputClass} min-h-[5rem]`}
            value={hazardsControls}
            onChange={(e) => setHazardsControls(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className={dfPrimarySubmit} disabled={create.isPending} aria-busy={create.isPending}>
            Create draft
          </button>
          <Link
            href="/dashboard/permits"
            className="inline-flex min-h-11 touch-target items-center rounded-md border border-zinc-300 px-4 py-2 text-base text-zinc-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
