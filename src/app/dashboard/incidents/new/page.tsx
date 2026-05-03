"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { trpc } from "@/trpc/react";
import { INCIDENT_SEVERITIES, INCIDENT_TYPES } from "@/lib/ehs-enums";

const severities = INCIDENT_SEVERITIES;

function formatTypeLabel(t: (typeof INCIDENT_TYPES)[number]): string {
  return t.replaceAll("_", " ");
}

export default function NewIncidentPage() {
  const router = useRouter();
  const formErrorId = useId();
  const { organizationId } = useOrg();
  const utils = trpc.useUtils();

  const { data: sites } = trpc.organization.sites.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<string>(severities[1] ?? "medium");
  const [incidentType, setIncidentType] = useState<string>(INCIDENT_TYPES[2] ?? "near_miss");
  const [siteId, setSiteId] = useState<string>("");
  const [occurredAtLocal, setOccurredAtLocal] = useState("");
  const [immediateActions, setImmediateActions] = useState("");
  const [regulatoryNotificationRequired, setRegulatoryNotificationRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = trpc.incident.create.useMutation({
    onSuccess: (created) => {
      void utils.incident.list.invalidate();
      router.push(`/dashboard/incidents/${created.id}`);
    },
    onError: (e) => setError(e.message),
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Report incident</h1>
        <OrgSwitcher />
      </div>
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!organizationId) return;
    setError(null);
    let occurredAt: Date | undefined;
    if (occurredAtLocal.trim()) {
      const d = new Date(occurredAtLocal);
      if (!Number.isNaN(d.getTime())) occurredAt = d;
    }
    create.mutate({
      organizationId,
      title,
      description,
      severity: severity as (typeof INCIDENT_SEVERITIES)[number],
      incidentType: incidentType as (typeof INCIDENT_TYPES)[number],
      siteId: siteId || undefined,
      occurredAt,
      immediateActions: immediateActions.trim() || undefined,
      regulatoryNotificationRequired: regulatoryNotificationRequired || undefined,
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Report incident</h1>
        <OrgSwitcher />
      </div>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <p className="text-sm text-zinc-600">
          Use short phrases if you are in a hurry — you can refine details from the incident record
          after submitting.
        </p>
        <div>
          <label htmlFor="itype" className="block text-sm font-medium">
            Event type
          </label>
          <select
            id="itype"
            value={incidentType}
            onChange={(e) => setIncidentType(e.target.value)}
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
          <label htmlFor="site" className="block text-sm font-medium">
            Site / location
          </label>
          <select
            id="site"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
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
            <p className="mt-1 text-xs text-zinc-500">
              No sites on file for this org yet — intake can continue without a site.
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="when" className="block text-sm font-medium">
            When it occurred (optional)
          </label>
          <input
            id="when"
            type="datetime-local"
            value={occurredAtLocal}
            onChange={(e) => setOccurredAtLocal(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? formErrorId : undefined}
            className="mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="desc" className="block text-sm font-medium">
            What happened
          </label>
          <textarea
            id="desc"
            required
            placeholder="Where, equipment/area, people involved, immediate outcome (bullets OK)"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? formErrorId : undefined}
            className="mt-1 min-h-[6rem] w-full rounded-md border border-zinc-300 px-3 py-3 text-base text-zinc-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="immediate" className="block text-sm font-medium">
            Immediate actions (optional)
          </label>
          <textarea
            id="immediate"
            rows={2}
            value={immediateActions}
            onChange={(e) => setImmediateActions(e.target.value)}
            placeholder="Barricade, first aid, shutoff, notify supervisor…"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-normal text-zinc-800">
          <input
            type="checkbox"
            checked={regulatoryNotificationRequired}
            onChange={(e) => setRegulatoryNotificationRequired(e.target.checked)}
          />
          Regulatory notification may be required
        </label>
        <div>
          <label htmlFor="sev" className="block text-sm font-medium">
            Severity
          </label>
          <select
            id="sev"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
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
        {error ? (
          <p id={formErrorId} className="text-base text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={create.isPending}
            aria-busy={create.isPending}
            className="min-h-11 touch-target rounded-md bg-emerald-800 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-900 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            {create.isPending ? "Saving…" : "Submit"}
          </button>
          <Link
            href="/dashboard/incidents"
            className="inline-flex min-h-11 touch-target items-center rounded-md border border-zinc-400 bg-white px-4 py-2 text-base font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            Cancel
          </Link>
        </div>
        <p className="text-xs text-zinc-500">
          After submit, open the incident to start investigation, add root cause, and close only when
          requirements are met.
        </p>
      </form>
    </div>
  );
}
