"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { useNavigatorOnline } from "@/hooks/useNavigatorOnline";
import {
  RISK_ASSESSMENT_KINDS,
  RISK_RATINGS,
} from "@/lib/ehs-enums";
import { dfLabel, dfMuted, dfPrimarySubmit } from "@/lib/dashboard-field-styles";
import {
  enqueueFieldOutbox,
  isFieldOutboxEnabled,
} from "@/lib/offline/fieldOutbox";
import { trpc } from "@/trpc/react";

const inputClass =
  "mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm";

export default function NewRiskAssessmentPage() {
  const router = useRouter();
  const formId = useId();
  const online = useNavigatorOnline();
  const { organizationId } = useOrg();

  const [hazardId, setHazardId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [summaryTitle, setSummaryTitle] = useState("");
  const [assessmentKind, setAssessmentKind] =
    useState<(typeof RISK_ASSESSMENT_KINDS)[number]>("general");
  const [context, setContext] = useState("");
  const [residualRating, setResidualRating] =
    useState<(typeof RISK_RATINGS)[number]>("medium");
  const [error, setError] = useState<string | null>(null);
  const [outboxStatus, setOutboxStatus] = useState<string | null>(null);

  const { data: sites } = trpc.organization.sites.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );
  const { data: hazards } = trpc.planning.hazard.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const utils = trpc.useUtils();
  const create = trpc.planning.risk.create.useMutation({
    onSuccess: (row) => {
      setOutboxStatus(null);
      void utils.planning.risk.list.invalidate();
      router.push(`/dashboard/risk-assessments/${row.id}`);
    },
    onError: (e) => setError(e.message),
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">New risk assessment</h1>
        <OrgSwitcher />
      </div>
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!organizationId) return;
    setError(null);
    setOutboxStatus(null);
    const orgId = organizationId;
    if (assessmentKind === "task_based") {
      setError(
        "Task-based (JSA) assessments need steps. Create a general assessment first, then edit it to add steps — or use Planning.",
      );
      return;
    }
    if (assessmentKind === "site_based" && !siteId.trim()) {
      setError("Site-based assessments require a site.");
      return;
    }
    const payload = {
      organizationId: orgId,
      hazardId: hazardId || undefined,
      siteId: siteId || undefined,
      summaryTitle: summaryTitle.trim() ? summaryTitle.trim() : undefined,
      assessmentKind,
      context: context.trim(),
      residualRating,
    };

    if (!online) {
      if (isFieldOutboxEnabled()) {
        void (async () => {
          try {
            await enqueueFieldOutbox({
              procedure: "planning.risk.create",
              organizationId: orgId,
              payloadJson: JSON.stringify(payload),
            });
            setOutboxStatus("Queued in this browser. It will send when you are back online.");
          } catch {
            setOutboxStatus("Could not queue offline assessment in this browser.");
          }
        })();
      }
      return;
    }

    create.mutate({
      organizationId: orgId,
      hazardId: hazardId || undefined,
      siteId: siteId || undefined,
      summaryTitle: summaryTitle.trim() || undefined,
      assessmentKind,
      context: context.trim(),
      residualRating,
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <DashboardPageHeader
        title="New risk assessment"
        description="General register entry. Use Planning for full ISO registers (objectives, controls). Task-based and site-based kinds use the detail editor after create."
        actions={
          <>
            <OrgSwitcher />
            <Link
              href="/dashboard/risk-assessments"
              className="inline-flex min-h-11 touch-target items-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-base font-medium text-zinc-800 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              Back to roster
            </Link>
          </>
        }
      />

      <form
        id={formId}
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
      >
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

        <div>
          <label htmlFor="ra-kind" className={dfLabel}>
            Assessment kind
          </label>
          <select
            id="ra-kind"
            className={inputClass}
            value={assessmentKind}
            onChange={(e) =>
              setAssessmentKind(e.target.value as (typeof RISK_ASSESSMENT_KINDS)[number])
            }
          >
            {RISK_ASSESSMENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {k.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <p className={`mt-1 ${dfMuted}`}>
            Task-based and site-based rules are enforced on save (steps / site).
          </p>
        </div>

        <div>
          <label htmlFor="ra-hazard" className={dfLabel}>
            Hazard link (optional)
          </label>
          <select
            id="ra-hazard"
            className={inputClass}
            value={hazardId}
            onChange={(e) => setHazardId(e.target.value)}
          >
            <option value="">— None —</option>
            {hazards?.map((h) => (
              <option key={h.id} value={h.id}>
                {h.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ra-site" className={dfLabel}>
            Site (optional; required for site-based)
          </label>
          <select
            id="ra-site"
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

        <div>
          <label htmlFor="ra-title" className={dfLabel}>
            Summary title (optional)
          </label>
          <input
            id="ra-title"
            className={inputClass}
            value={summaryTitle}
            onChange={(e) => setSummaryTitle(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="ra-ctx" className={dfLabel}>
            Context / scenario (min 10 characters)
          </label>
          <textarea
            id="ra-ctx"
            required
            minLength={10}
            rows={4}
            className={inputClass}
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="ra-res" className={dfLabel}>
            Residual risk rating
          </label>
          <select
            id="ra-res"
            className={inputClass}
            value={residualRating}
            onChange={(e) =>
              setResidualRating(e.target.value as (typeof RISK_RATINGS)[number])
            }
          >
            {RISK_RATINGS.map((r) => (
              <option key={r} value={r}>
                {r.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={create.isPending}
          aria-busy={create.isPending}
          className={dfPrimarySubmit}
        >
          Save assessment
        </button>
      </form>
    </div>
  );
}
