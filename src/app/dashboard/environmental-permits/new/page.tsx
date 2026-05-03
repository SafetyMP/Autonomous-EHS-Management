"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { useNavigatorOnline } from "@/hooks/useNavigatorOnline";
import {
  ENVIRONMENTAL_REGULATORY_PERMIT_MEDIA,
  ENVIRONMENTAL_REGULATORY_PERMIT_STATUS,
} from "@/lib/ehs-enums";
import { dfLabel, dfMuted, dfPrimarySubmit, dfSectionHeading } from "@/lib/dashboard-field-styles";
import {
  enqueueFieldOutbox,
  isFieldOutboxEnabled,
} from "@/lib/offline/fieldOutbox";
import { trpc } from "@/trpc/react";

const inputClass =
  "mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm";

type CondDraft = { conditionText: string; referenceCode: string };

export default function NewEnvironmentalPermitPage() {
  const router = useRouter();
  const formId = useId();
  const liveId = useId();
  const online = useNavigatorOnline();
  const { organizationId } = useOrg();

  const [title, setTitle] = useState("");
  const [permitIdentifier, setPermitIdentifier] = useState("");
  const [agency, setAgency] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [media, setMedia] = useState<(typeof ENVIRONMENTAL_REGULATORY_PERMIT_MEDIA)[number]>("general");
  const [status, setStatus] =
    useState<(typeof ENVIRONMENTAL_REGULATORY_PERMIT_STATUS)[number]>("draft");
  const [siteId, setSiteId] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [legalCitations, setLegalCitations] = useState("");
  const [limitsJson, setLimitsJson] = useState("");
  const [conditions, setConditions] = useState<CondDraft[]>([{ conditionText: "", referenceCode: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [outboxStatus, setOutboxStatus] = useState<string | null>(null);

  const { data: sites } = trpc.organization.sites.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const utils = trpc.useUtils();
  const create = trpc.environmentalRegulatoryPermit.create.useMutation({
    onSuccess: (row) => {
      void utils.environmentalRegulatoryPermit.list.invalidate();
      router.push(`/dashboard/environmental-permits/${row.id}`);
    },
    onError: (e) => setError(e.message),
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">New environmental permit</h1>
        <OrgSwitcher />
      </div>
    );
  }

  function addCondition() {
    setConditions((c) => [...c, { conditionText: "", referenceCode: "" }]);
  }

  function patchCondition(i: number, patch: Partial<CondDraft>) {
    setConditions((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function removeCondition(i: number) {
    setConditions((rows) => rows.filter((_r, j) => j !== i));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!organizationId) return;
    setError(null);
    setOutboxStatus(null);
    let limits: Record<string, string | number | boolean | null> | undefined;
    const raw = limitsJson.trim();
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
          setError("Limits must be a JSON object.");
          return;
        }
        const obj = parsed as Record<string, unknown>;
        const limitsParsed: Record<string, string | number | boolean | null> = {};
        for (const [k, v] of Object.entries(obj)) {
          if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
            limitsParsed[k] = v;
          } else {
            setError("Limits values must be string, number, boolean, or null.");
            return;
          }
        }
        limits = limitsParsed;
      } catch {
        setError("Limits JSON is invalid.");
        return;
      }
    }

    const cleaned = conditions
      .map((c) => ({
        conditionText: c.conditionText.trim(),
        referenceCode: c.referenceCode.trim() || null,
      }))
      .filter((c) => c.conditionText.length > 0);

    const orgId = organizationId;
    const payload = {
      organizationId: orgId,
      title: title.trim(),
      permitIdentifier: permitIdentifier.trim(),
      agency: agency.trim() || null,
      jurisdiction: jurisdiction.trim() || null,
      media,
      status: status === "pending_approval" ? "draft" : status,
      siteId: siteId || null,
      issuedAt: issuedAt ? new Date(`${issuedAt}T12:00:00`).toISOString() : null,
      effectiveFrom: effectiveFrom ? new Date(`${effectiveFrom}T12:00:00`).toISOString() : null,
      expiresAt: expiresAt ? new Date(`${expiresAt}T12:00:00`).toISOString() : null,
      legalCitations: legalCitations.trim() || null,
      limits: limits ?? undefined,
      conditions: cleaned.length ? cleaned : undefined,
    };

    if (!online) {
      if (isFieldOutboxEnabled()) {
        void (async () => {
          try {
            await enqueueFieldOutbox({
              procedure: "environmentalRegulatoryPermit.create",
              organizationId: orgId,
              payloadJson: JSON.stringify(payload),
            });
            setOutboxStatus("Queued in this browser. It will send when you are back online.");
          } catch {
            setOutboxStatus("Could not queue offline permit in this browser.");
          }
        })();
      }
      return;
    }

    create.mutate({
      organizationId,
      title: title.trim(),
      permitIdentifier: permitIdentifier.trim(),
      agency: agency.trim() || null,
      jurisdiction: jurisdiction.trim() || null,
      media,
      status: status === "pending_approval" ? "draft" : status,
      siteId: siteId || null,
      issuedAt: issuedAt ? new Date(`${issuedAt}T12:00:00`) : null,
      effectiveFrom: effectiveFrom ? new Date(`${effectiveFrom}T12:00:00`) : null,
      expiresAt: expiresAt ? new Date(`${expiresAt}T12:00:00`) : null,
      legalCitations: legalCitations.trim() || null,
      limits,
      conditions: cleaned.length ? cleaned : undefined,
    });
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="New environmental permit"
        description="Create a regulatory permit register row. This is not an agency submission."
        actions={
          <>
            <OrgSwitcher />
            <Link
              href="/dashboard/environmental-permits"
              className="inline-flex min-h-11 touch-target items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-base font-medium text-zinc-800 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              Back to roster
            </Link>
          </>
        }
      />

      <div id={liveId} role="status" aria-live="polite" className="sr-only">
        {error ? `Error: ${error}` : ""}
      </div>

      <form id={formId} onSubmit={onSubmit} className="space-y-8">
        {outboxStatus ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-base text-amber-950">
            {outboxStatus}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-base text-red-900">
            {error}
          </p>
        ) : null}

        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className={dfSectionHeading}>Identity</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="ep-title" className={dfLabel}>
                Title
              </label>
              <input
                id="ep-title"
                required
                minLength={2}
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="ep-id" className={dfLabel}>
                Permit identifier
              </label>
              <input
                id="ep-id"
                required
                className={inputClass}
                value={permitIdentifier}
                onChange={(e) => setPermitIdentifier(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="ep-agency" className={dfLabel}>
                Agency
              </label>
              <input
                id="ep-agency"
                className={inputClass}
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="ep-jur" className={dfLabel}>
                Jurisdiction
              </label>
              <input
                id="ep-jur"
                className={inputClass}
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="ep-media" className={dfLabel}>
                Media
              </label>
              <select
                id="ep-media"
                className={inputClass}
                value={media}
                onChange={(e) =>
                  setMedia(e.target.value as (typeof ENVIRONMENTAL_REGULATORY_PERMIT_MEDIA)[number])
                }
              >
                {ENVIRONMENTAL_REGULATORY_PERMIT_MEDIA.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ep-status" className={dfLabel}>
                Status
              </label>
              <select
                id="ep-status"
                className={inputClass}
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as (typeof ENVIRONMENTAL_REGULATORY_PERMIT_STATUS)[number],
                  )
                }
              >
                {ENVIRONMENTAL_REGULATORY_PERMIT_STATUS.filter((s) => s !== "pending_approval").map(
                  (s) => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="ep-site" className={dfLabel}>
                Site (optional)
              </label>
              <select
                id="ep-site"
                className={inputClass}
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
              >
                <option value="">— None —</option>
                {sites?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className={dfSectionHeading}>Dates</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="ep-issued" className={dfLabel}>
                Issued
              </label>
              <input
                id="ep-issued"
                type="date"
                className={inputClass}
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="ep-eff" className={dfLabel}>
                Effective from
              </label>
              <input
                id="ep-eff"
                type="date"
                className={inputClass}
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="ep-exp" className={dfLabel}>
                Expires
              </label>
              <input
                id="ep-exp"
                type="date"
                className={inputClass}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className={dfSectionHeading}>Legal &amp; limits</h2>
          <p className={`mt-1 ${dfMuted}`}>
            Limits are optional key-value JSON (validated on save).
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="ep-legal" className={dfLabel}>
                Legal citations / notes
              </label>
              <textarea
                id="ep-legal"
                rows={3}
                className={inputClass}
                value={legalCitations}
                onChange={(e) => setLegalCitations(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="ep-limits" className={dfLabel}>
                Limits (JSON object)
              </label>
              <textarea
                id="ep-limits"
                rows={4}
                placeholder='{"no2_lb_hr": 100}'
                className={`${inputClass} font-mono text-sm`}
                value={limitsJson}
                onChange={(e) => setLimitsJson(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={dfSectionHeading}>Conditions</h2>
            <button
              type="button"
              onClick={addCondition}
              className="min-h-11 rounded-md border border-zinc-300 bg-white px-4 text-base font-medium text-zinc-800 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              Add condition
            </button>
          </div>
          <ol className="mt-4 list-decimal space-y-3 pl-5">
            {conditions.map((c, i) => (
              <li key={i}>
                <div className="space-y-2 rounded-md border border-zinc-100 p-3">
                  <div>
                    <label className={dfLabel} htmlFor={`ep-c-${i}`}>
                      Condition text
                    </label>
                    <textarea
                      id={`ep-c-${i}`}
                      rows={2}
                      className={inputClass}
                      value={c.conditionText}
                      onChange={(e) => patchCondition(i, { conditionText: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={dfLabel} htmlFor={`ep-cr-${i}`}>
                      Reference code (optional)
                    </label>
                    <input
                      id={`ep-cr-${i}`}
                      className={inputClass}
                      value={c.referenceCode}
                      onChange={(e) => patchCondition(i, { referenceCode: e.target.value })}
                    />
                  </div>
                  {conditions.length > 1 ? (
                    <button
                      type="button"
                      className="text-base font-medium text-red-800 underline"
                      onClick={() => removeCondition(i)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <button
          type="submit"
          disabled={create.isPending}
          aria-busy={create.isPending}
          className={dfPrimarySubmit}
        >
          Create permit
        </button>
      </form>
    </div>
  );
}
