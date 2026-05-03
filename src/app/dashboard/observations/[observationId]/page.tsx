"use client";

import type { inferRouterOutputs } from "@trpc/server";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useId, useState } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfLabel,
  dfMuted,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import type { AppRouter } from "@/server/trpc/root";
import { trpc } from "@/trpc/react";

const inputClass =
  "mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm";

const categories = ["positive_behavior", "at_risk_behavior", "unsafe_condition", "other"] as const;
const severities = ["low", "medium", "high", "critical"] as const;
const obsStatuses = ["open", "acknowledged", "closed"] as const;

type ObservationRow = NonNullable<inferRouterOutputs<AppRouter>["observation"]["get"]>;

function observationDateStr(row: ObservationRow): string {
  const d = new Date(row.observedAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDatetimeLocalValue(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day}T${h}:${m}`;
}

function ObservationEditor({
  observationId,
  organizationId,
  row,
}: {
  observationId: string;
  organizationId: string;
  row: ObservationRow;
}) {
  const formId = useId();
  const [summary, setSummary] = useState(row.summary);
  const [details, setDetails] = useState(row.details ?? "");
  const [category, setCategory] = useState<(typeof categories)[number]>(
    categories.includes(row.category as (typeof categories)[number])
      ? (row.category as (typeof categories)[number])
      : "other",
  );
  const [severity, setSeverity] = useState<(typeof severities)[number]>(
    severities.includes(row.severity as (typeof severities)[number])
      ? (row.severity as (typeof severities)[number])
      : "medium",
  );
  const [status, setStatus] = useState<(typeof obsStatuses)[number]>(
    obsStatuses.includes(row.status as (typeof obsStatuses)[number])
      ? (row.status as (typeof obsStatuses)[number])
      : "open",
  );
  const [siteId, setSiteId] = useState(row.siteId ?? "");
  const [dirty, setDirty] = useState(false);
  const [capaId, setCapaId] = useState("");
  const [observedDate, setObservedDate] = useState(() => observationDateStr(row));
  const [assigneeUserId, setAssigneeUserId] = useState(row.assigneeUserId ?? "");
  const [followUpDueLocal, setFollowUpDueLocal] = useState(() =>
    row.followUpDueAt ? toDatetimeLocalValue(new Date(row.followUpDueAt)) : "",
  );

  const { data: sites } = trpc.organization.sites.useQuery(
    { organizationId },
    { enabled: !!organizationId },
  );

  const { data: members } = trpc.organization.members.useQuery(
    { organizationId },
    { enabled: !!organizationId },
  );

  const { data: escalations } = trpc.observation.listEscalations.useQuery(
    { organizationId, observationId: row.id },
    { enabled: !!organizationId },
  );

  const { data: capas } = trpc.capa.list.useQuery({ organizationId }, { enabled: !!organizationId });

  const utils = trpc.useUtils();

  const updateMut = trpc.observation.update.useMutation({
    onSuccess: async () => {
      await utils.observation.get.invalidate({ organizationId, observationId });
      await utils.observation.list.invalidate();
      await utils.observation.listEscalations.invalidate({ organizationId, observationId: row.id });
      setDirty(false);
    },
  });

  const linkMut = trpc.observation.linkToCapa.useMutation({
    onSuccess: async () => {
      await utils.observation.get.invalidate({ organizationId, observationId });
      await utils.observation.list.invalidate();
      setCapaId("");
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">
            <Link href="/dashboard/observations" className="text-emerald-800 underline">
              Observations
            </Link>
            <span aria-hidden>/</span> {row.summary.slice(0, 48)}
            {row.summary.length > 48 ? "…" : ""}
          </p>
          <h1 className={`mt-1 ${dfSectionHeading}`}>{row.summary}</h1>
          <p className={`mt-1 capitalize ${dfMuted}`}>
            {row.category.replaceAll("_", " ")} · {row.severity} · {row.status}
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <form
        id={formId}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          let observedAtParsed: Date | undefined;
          if (observedDate.trim()) {
            const d = new Date(`${observedDate}T12:00:00`);
            if (!Number.isNaN(d.getTime())) observedAtParsed = d;
          }
          let followUpParsed: Date | null = null;
          if (followUpDueLocal.trim()) {
            const fd = new Date(followUpDueLocal);
            followUpParsed = Number.isNaN(fd.getTime()) ? null : fd;
          }
          updateMut.mutate({
            organizationId,
            observationId: row.id,
            summary: summary.trim(),
            details: details.trim() || null,
            category,
            severity,
            status,
            siteId: siteId || null,
            observedAt: observedAtParsed,
            assigneeUserId: assigneeUserId.trim() === "" ? null : assigneeUserId.trim(),
            followUpDueAt: followUpParsed,
          });
        }}
      >
        <div>
          <label className={dfLabel} htmlFor={`${formId}-sum`}>
            Summary
          </label>
          <input
            id={`${formId}-sum`}
            required
            className={inputClass}
            value={summary}
            onChange={(e) => {
              setDirty(true);
              setSummary(e.target.value);
            }}
          />
        </div>
        <div>
          <label className={dfLabel} htmlFor={`${formId}-det`}>
            Notes
          </label>
          <textarea
            id={`${formId}-det`}
            rows={4}
            className={`${inputClass} min-h-[6rem]`}
            value={details}
            onChange={(e) => {
              setDirty(true);
              setDetails(e.target.value);
            }}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={dfLabel} htmlFor={`${formId}-cat`}>
              Category
            </label>
            <select
              id={`${formId}-cat`}
              className={inputClass}
              value={category}
              onChange={(e) => {
                setDirty(true);
                setCategory(e.target.value as (typeof categories)[number]);
              }}
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
              onChange={(e) => {
                setDirty(true);
                setSeverity(e.target.value as (typeof severities)[number]);
              }}
            >
              {severities.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={dfLabel} htmlFor={`${formId}-st`}>
              Status
            </label>
            <select
              id={`${formId}-st`}
              className={inputClass}
              value={status}
              onChange={(e) => {
                setDirty(true);
                setStatus(e.target.value as (typeof obsStatuses)[number]);
              }}
            >
              {obsStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={dfLabel} htmlFor={`${formId}-when`}>
              Observed date
            </label>
            <input
              id={`${formId}-when`}
              type="date"
              className={inputClass}
              value={observedDate}
              onChange={(e) => {
                setDirty(true);
                setObservedDate(e.target.value);
              }}
            />
          </div>
        </div>

        <div>
          <label className={dfLabel} htmlFor={`${formId}-site`}>
            Site
          </label>
          <select
            id={`${formId}-site`}
            className={inputClass}
            value={siteId}
            onChange={(e) => {
              setDirty(true);
              setSiteId(e.target.value);
            }}
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
          <label className={dfLabel} htmlFor={`${formId}-follow-assign`}>
            Follow-up assignee
          </label>
          <select
            id={`${formId}-follow-assign`}
            className={inputClass}
            value={assigneeUserId}
            onChange={(e) => {
              setDirty(true);
              setAssigneeUserId(e.target.value);
            }}
          >
            <option value="">Unassigned</option>
            {(members ?? []).map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.email}
              </option>
            ))}
          </select>
          <p id={`${formId}-follow-hint`} className={`mt-1 text-sm ${dfMuted}`}>
            Set a due date to start SLA tracking for open or acknowledged observations. Cron records an
            escalation when the due date passes.
          </p>
        </div>
        <div>
          <label className={dfLabel} htmlFor={`${formId}-follow-due`}>
            Follow-up due
          </label>
          <input
            id={`${formId}-follow-due`}
            type="datetime-local"
            className={inputClass}
            value={followUpDueLocal}
            aria-describedby={`${formId}-follow-hint`}
            onChange={(e) => {
              setDirty(true);
              setFollowUpDueLocal(e.target.value);
            }}
          />
        </div>

        <button
          type="submit"
          className={dfPrimarySubmit}
          disabled={updateMut.isPending || !dirty}
          aria-busy={updateMut.isPending}
        >
          Save changes
        </button>
      </form>

      <section
        className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
        aria-label="Follow-up escalation history"
      >
        <h2 className="text-lg font-semibold text-zinc-900">Follow-up escalations</h2>
        <p className={`mt-1 text-sm ${dfMuted}`}>
          Recorded when a follow-up due date passes while the observation is still open or acknowledged.
        </p>
        {escalations && escalations.length > 0 ? (
          <ul className="mt-4 list-inside list-disc space-y-2 text-base text-zinc-800">
            {escalations.map((ev) => (
              <li key={ev.id}>
                <time dateTime={ev.detectedAt.toISOString()}>
                  {ev.detectedAt.toLocaleString()}
                </time>
                {ev.message ? ` — ${ev.message}` : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-base text-zinc-600" role="status">
            No escalations recorded for this observation.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Link to CAPA</h2>
        <p className={`mt-1 text-sm ${dfMuted}`}>Connect this observation follow-up to an existing corrective action.</p>
        {row.linkedCorrectiveActionId ? (
          <p className="mt-3 text-base text-zinc-800">
            Linked CAPA ID:{" "}
            <Link href="/dashboard/capa" className="font-medium text-emerald-900 underline">
              {row.linkedCorrectiveActionId}
            </Link>
          </p>
        ) : (
          <>
            <div className="mt-4 max-w-md">
              <label className={dfLabel} htmlFor={`${formId}-capa`}>
                Corrective action
              </label>
              <select
                id={`${formId}-capa`}
                className={inputClass}
                value={capaId}
                onChange={(e) => setCapaId(e.target.value)}
              >
                <option value="">Choose CAPA…</option>
                {capas?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className={`${dfSecondaryOutline} mt-4`}
              disabled={linkMut.isPending || !capaId}
              onClick={() =>
                linkMut.mutate({
                  organizationId,
                  observationId: row.id,
                  correctiveActionId: capaId,
                })
              }
            >
              Link selected CAPA
            </button>
          </>
        )}
      </section>
    </div>
  );
}

export default function ObservationDetailPage() {
  const params = useParams();
  const observationId = typeof params.observationId === "string" ? params.observationId : null;
  const { organizationId } = useOrg();
  const org = organizationId ?? "";

  const { data: row, isLoading } = trpc.observation.get.useQuery(
    { organizationId: org, observationId: observationId! },
    { enabled: !!organizationId && !!observationId },
  );

  if (!organizationId || !observationId) {
    return (
      <div className="space-y-4">
        <p className="text-zinc-700">Missing observation.</p>
        <OrgSwitcher />
      </div>
    );
  }

  if (isLoading || !row) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <span className="text-zinc-600">Loading…</span>
      </div>
    );
  }

  const editorKey = `${observationId}-${row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt)}`;

  return (
    <ObservationEditor key={editorKey} organizationId={org} observationId={observationId} row={row} />
  );
}
