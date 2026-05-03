"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  RISK_ASSESSMENT_KINDS,
  RISK_ASSESSMENT_STATUSES,
  RISK_RATINGS,
} from "@/lib/ehs-enums";
import {
  dfLabel,
  dfMuted,
  dfPrimarySubmit,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

const inputClass =
  "mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm";

function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type StepDraft = {
  taskDescription: string;
  hazardText: string;
  controlsText: string;
  inherentRating: (typeof RISK_RATINGS)[number] | "";
  residualRating: (typeof RISK_RATINGS)[number] | "";
};

export default function RiskAssessmentDetailPage() {
  const params = useParams();
  const riskAssessmentId = String(params.riskAssessmentId ?? "");
  const formId = useId();
  const liveId = useId();
  const { organizationId } = useOrg();

  const [summaryTitle, setSummaryTitle] = useState("");
  const [assessmentKind, setAssessmentKind] = useState<(typeof RISK_ASSESSMENT_KINDS)[number]>("general");
  const [status, setStatus] = useState<(typeof RISK_ASSESSMENT_STATUSES)[number]>("draft");
  const [siteId, setSiteId] = useState("");
  const [hazardId, setHazardId] = useState("");
  const [reviewDue, setReviewDue] = useState("");
  const [context, setContext] = useState("");
  const [existingControls, setExistingControls] = useState("");
  const [inherentRating, setInherentRating] = useState<(typeof RISK_RATINGS)[number] | "">("");
  const [residualRating, setResidualRating] = useState<(typeof RISK_RATINGS)[number]>("medium");
  const [likelihoodScore, setLikelihoodScore] = useState("");
  const [consequenceScore, setConsequenceScore] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = trpc.planning.risk.get.useQuery(
    { organizationId: organizationId!, riskAssessmentId },
    { enabled: !!organizationId && !!riskAssessmentId },
  );

  const { data: sites } = trpc.organization.sites.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const { data: hazards } = trpc.planning.hazard.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const utils = trpc.useUtils();

  useEffect(() => {
    if (!data?.assessment) return;
    const a = data.assessment;
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate controlled form from tRPC query */
    setSummaryTitle(a.summaryTitle ?? "");
    setAssessmentKind(
      RISK_ASSESSMENT_KINDS.includes(a.assessmentKind as (typeof RISK_ASSESSMENT_KINDS)[number])
        ? (a.assessmentKind as (typeof RISK_ASSESSMENT_KINDS)[number])
        : "general",
    );
    setStatus(
      RISK_ASSESSMENT_STATUSES.includes(a.status as (typeof RISK_ASSESSMENT_STATUSES)[number])
        ? (a.status as (typeof RISK_ASSESSMENT_STATUSES)[number])
        : "draft",
    );
    setSiteId(a.siteId ?? "");
    setHazardId(a.hazardId ?? "");
    setReviewDue(toDateInput(a.reviewDueAt ?? undefined));
    setContext(a.context);
    setExistingControls(a.existingControls ?? "");
    setInherentRating(
      a.inherentRating && RISK_RATINGS.includes(a.inherentRating as (typeof RISK_RATINGS)[number])
        ? (a.inherentRating as (typeof RISK_RATINGS)[number])
        : "",
    );
    setResidualRating(
      RISK_RATINGS.includes(a.residualRating as (typeof RISK_RATINGS)[number])
        ? (a.residualRating as (typeof RISK_RATINGS)[number])
        : "medium",
    );
    setLikelihoodScore(a.likelihoodScore != null ? String(a.likelihoodScore) : "");
    setConsequenceScore(a.consequenceScore != null ? String(a.consequenceScore) : "");
    setSteps(
      data.steps.length
        ? data.steps.map((s) => ({
            taskDescription: s.taskDescription,
            hazardText: s.hazardText,
            controlsText: s.controlsText ?? "",
            inherentRating:
              s.inherentRating &&
              RISK_RATINGS.includes(s.inherentRating as (typeof RISK_RATINGS)[number])
                ? (s.inherentRating as (typeof RISK_RATINGS)[number])
                : "",
            residualRating:
              s.residualRating &&
              RISK_RATINGS.includes(s.residualRating as (typeof RISK_RATINGS)[number])
                ? (s.residualRating as (typeof RISK_RATINGS)[number])
                : "",
          }))
        : [],
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [data]);

  const updateMut = trpc.planning.risk.update.useMutation({
    onSuccess: async () => {
      setError(null);
      await utils.planning.risk.get.invalidate({ organizationId: organizationId!, riskAssessmentId });
      await utils.planning.risk.list.invalidate();
    },
    onError: (e) => setError(e.message),
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Risk assessment</h1>
        <OrgSwitcher />
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!organizationId) return;
    setError(null);
    const ctxTrim = context.trim();
    if (ctxTrim.length < 10) {
      setError("Context must be at least 10 characters.");
      return;
    }
    const replaceSteps =
      assessmentKind === "task_based"
        ? steps.map((s, i) => ({
            sortOrder: i,
            taskDescription: s.taskDescription.trim(),
            hazardText: s.hazardText.trim(),
            controlsText: s.controlsText.trim() || null,
            inherentRating:
              s.inherentRating && RISK_RATINGS.includes(s.inherentRating)
                ? s.inherentRating
                : null,
            residualRating:
              s.residualRating && RISK_RATINGS.includes(s.residualRating)
                ? s.residualRating
                : null,
          }))
        : [];

    updateMut.mutate({
      organizationId,
      riskAssessmentId,
      summaryTitle: summaryTitle.trim() || null,
      assessmentKind,
      status,
      siteId: siteId || null,
      hazardId: hazardId || null,
      reviewDueAt: reviewDue ? new Date(`${reviewDue}T12:00:00`) : null,
      context: ctxTrim,
      existingControls: existingControls.trim() || null,
      inherentRating:
        inherentRating && RISK_RATINGS.includes(inherentRating) ? inherentRating : null,
      residualRating:
        residualRating && RISK_RATINGS.includes(residualRating) ? residualRating : undefined,
      likelihoodScore: likelihoodScore.trim() ? Number.parseInt(likelihoodScore, 10) : null,
      consequenceScore: consequenceScore.trim() ? Number.parseInt(consequenceScore, 10) : null,
      replaceSteps,
    });
  }

  function addStep() {
    setSteps((prev) => [
      ...prev,
      {
        taskDescription: "",
        hazardText: "",
        controlsText: "",
        inherentRating: "",
        residualRating: "",
      },
    ]);
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  function patchStep(idx: number, patch: Partial<StepDraft>) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Risk assessment"
        description="Edit roster fields and JSA steps. Task-based assessments must keep at least one step."
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

      <div id={liveId} role="status" aria-live="polite" className="sr-only">
        {error ? `Error: ${error}` : ""}
      </div>

      {isLoading ? (
        <p className="text-base" role="status">
          Loading…
        </p>
      ) : isError || !data?.assessment ? (
        <p className="text-base text-red-800">Could not load this assessment.</p>
      ) : (
        <form id={formId} onSubmit={submit} className="space-y-8">
          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-base text-red-900">
              {error}
            </p>
          ) : null}

          <section className="rounded-lg border border-zinc-200 bg-white p-4" aria-labelledby="ra-core-h">
            <h2 id="ra-core-h" className={dfSectionHeading}>
              Core
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="ra-summary" className={dfLabel}>
                  Title / summary
                </label>
                <input
                  id="ra-summary"
                  className={inputClass}
                  value={summaryTitle}
                  onChange={(e) => setSummaryTitle(e.target.value)}
                  maxLength={512}
                />
              </div>
              <div>
                <label htmlFor="ra-kind" className={dfLabel}>
                  Kind
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
              </div>
              <div>
                <label htmlFor="ra-status" className={dfLabel}>
                  Status
                </label>
                <select
                  id="ra-status"
                  className={inputClass}
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as (typeof RISK_ASSESSMENT_STATUSES)[number])
                  }
                >
                  {RISK_ASSESSMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ra-site" className={dfLabel}>
                  Site
                </label>
                <select
                  id="ra-site"
                  className={inputClass}
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  aria-required={assessmentKind === "site_based"}
                >
                  <option value="">— None —</option>
                  {sites?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {assessmentKind === "site_based" ? (
                  <p className={`mt-1 ${dfMuted}`}>Site-based assessments require a site.</p>
                ) : null}
              </div>
              <div>
                <label htmlFor="ra-hazard" className={dfLabel}>
                  Linked hazard (optional)
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
                <label htmlFor="ra-review" className={dfLabel}>
                  Review due (date)
                </label>
                <input
                  id="ra-review"
                  type="date"
                  className={inputClass}
                  value={reviewDue}
                  onChange={(e) => setReviewDue(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4" aria-labelledby="ra-text-h">
            <h2 id="ra-text-h" className={dfSectionHeading}>
              Narrative &amp; ratings
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="ra-context" className={dfLabel}>
                  Context / scenario
                </label>
                <textarea
                  id="ra-context"
                  required
                  minLength={10}
                  rows={5}
                  className={inputClass}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="ra-controls" className={dfLabel}>
                  Existing controls
                </label>
                <textarea
                  id="ra-controls"
                  rows={3}
                  className={inputClass}
                  value={existingControls}
                  onChange={(e) => setExistingControls(e.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="ra-inherent" className={dfLabel}>
                    Inherent rating
                  </label>
                  <select
                    id="ra-inherent"
                    className={inputClass}
                    value={inherentRating}
                    onChange={(e) =>
                      setInherentRating(
                        e.target.value
                          ? (e.target.value as (typeof RISK_RATINGS)[number])
                          : "",
                      )
                    }
                  >
                    <option value="">— Not set —</option>
                    {RISK_RATINGS.map((r) => (
                      <option key={r} value={r}>
                        {r.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ra-residual" className={dfLabel}>
                    Residual rating
                  </label>
                  <select
                    id="ra-residual"
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
                <div>
                  <label htmlFor="ra-likelihood" className={dfLabel}>
                    Likelihood score (1–25)
                  </label>
                  <input
                    id="ra-likelihood"
                    type="number"
                    min={1}
                    max={25}
                    className={inputClass}
                    value={likelihoodScore}
                    onChange={(e) => setLikelihoodScore(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="ra-consequence" className={dfLabel}>
                    Consequence score (1–25)
                  </label>
                  <input
                    id="ra-consequence"
                    type="number"
                    min={1}
                    max={25}
                    className={inputClass}
                    value={consequenceScore}
                    onChange={(e) => setConsequenceScore(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {assessmentKind === "task_based" ? (
            <section className="rounded-lg border border-zinc-200 bg-white p-4" aria-labelledby="ra-steps-h">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="ra-steps-h" className={dfSectionHeading}>
                  Task steps (JSA)
                </h2>
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-zinc-300 bg-white px-4 text-base font-medium text-zinc-800 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  onClick={addStep}
                >
                  Add step
                </button>
              </div>
              <p className={`mt-1 ${dfMuted}`}>
                Each step needs a task description and hazard; controls are optional.
              </p>
              <ol className="mt-4 list-decimal space-y-4 pl-5">
                {steps.map((s, idx) => (
                  <li key={idx} className="rounded-md border border-zinc-100 p-3">
                    <div className="space-y-2">
                      <div>
                        <label className={dfLabel} htmlFor={`ra-step-task-${idx}`}>
                          Step {idx + 1} — task
                        </label>
                        <input
                          id={`ra-step-task-${idx}`}
                          className={inputClass}
                          value={s.taskDescription}
                          onChange={(e) => patchStep(idx, { taskDescription: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={dfLabel} htmlFor={`ra-step-haz-${idx}`}>
                          Hazard
                        </label>
                        <input
                          id={`ra-step-haz-${idx}`}
                          className={inputClass}
                          value={s.hazardText}
                          onChange={(e) => patchStep(idx, { hazardText: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={dfLabel} htmlFor={`ra-step-ctrl-${idx}`}>
                          Controls
                        </label>
                        <input
                          id={`ra-step-ctrl-${idx}`}
                          className={inputClass}
                          value={s.controlsText}
                          onChange={(e) => patchStep(idx, { controlsText: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <label className={dfLabel} htmlFor={`ra-step-ir-${idx}`}>
                            Inherent
                          </label>
                          <select
                            id={`ra-step-ir-${idx}`}
                            className={inputClass}
                            value={s.inherentRating}
                            onChange={(e) =>
                              patchStep(idx, {
                                inherentRating: e.target.value
                                  ? (e.target.value as (typeof RISK_RATINGS)[number])
                                  : "",
                              })
                            }
                          >
                            <option value="">—</option>
                            {RISK_RATINGS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={dfLabel} htmlFor={`ra-step-rr-${idx}`}>
                            Residual
                          </label>
                          <select
                            id={`ra-step-rr-${idx}`}
                            className={inputClass}
                            value={s.residualRating}
                            onChange={(e) =>
                              patchStep(idx, {
                                residualRating: e.target.value
                                  ? (e.target.value as (typeof RISK_RATINGS)[number])
                                  : "",
                              })
                            }
                          >
                            <option value="">—</option>
                            {RISK_RATINGS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-base font-medium text-red-800 underline"
                        onClick={() => removeStep(idx)}
                      >
                        Remove step
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <button
            type="submit"
            disabled={updateMut.isPending}
            aria-busy={updateMut.isPending}
            className={dfPrimarySubmit}
          >
            Save changes
          </button>
        </form>
      )}
    </div>
  );
}
