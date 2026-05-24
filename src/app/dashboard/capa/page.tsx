"use client";

import type { inferRouterOutputs } from "@trpc/server";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { EhsEvidenceRegistrySection } from "@/components/dashboard/ehs-evidence-registry-section";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { dfMuted, dfSecondaryOutline } from "@/lib/dashboard-field-styles";
import type { AppRouter } from "@/server/trpc/root";
import { trpc } from "@/trpc/react";

type CapaRow = inferRouterOutputs<AppRouter>["capa"]["list"][number];

const inputClass =
  "mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm";

const textareaClass =
  "mt-1 min-h-[6rem] w-full rounded-md border border-zinc-300 px-3 py-3 text-base text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm";

const labelClass = "block text-sm font-semibold text-zinc-900";

const primaryBtn =
  "min-h-11 touch-target rounded-md bg-emerald-800 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

const secondaryBtn =
  "touch-target rounded-md border-2 border-zinc-400 bg-white px-4 py-2 text-base font-semibold text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2";

const tableActionBtn =
  "touch-target rounded-md px-3 text-base font-semibold text-emerald-900 underline decoration-emerald-800 underline-offset-2 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50";

const radioRowClass =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-base text-zinc-900 hover:bg-emerald-50/50 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-600 sm:text-sm";

function nextCapaStatus(
  s: string,
): "planned" | "in_progress" | "completed" | "verified" | null {
  switch (s) {
    case "pending_approval":
      return "planned";
    case "planned":
      return "in_progress";
    case "in_progress":
      return "completed";
    case "completed":
      return "verified";
    default:
      return null;
  }
}

function advanceLabel(s: string): string {
  switch (s) {
    case "pending_approval":
      return "Approve plan";
    case "planned":
      return "Start work";
    case "in_progress":
      return "Mark complete";
    case "completed":
      return "Verify effectiveness";
    default:
      return "Advance";
  }
}

function isCapaOverdue(c: {
  dueDate: Date | string | null;
  status: string;
}): boolean {
  if (!c.dueDate || c.status === "verified") return false;
  const d = new Date(c.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

const isoRelatedLinkClass =
  "text-xs font-medium text-emerald-900 underline decoration-emerald-800 underline-offset-2 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";

function CapaIsoLinks({
  row,
  aspectNameById,
  obligationTitleById,
  mgmtReviewLabelById,
}: {
  row: CapaRow;
  aspectNameById: Map<string, string> | null;
  obligationTitleById: Map<string, string> | null;
  mgmtReviewLabelById: Map<string, string> | null;
}) {
  const links: { key: string; href: string; label: string }[] = [];
  if (row.environmentalAspectId) {
    const name = aspectNameById?.get(row.environmentalAspectId);
    links.push({
      key: "aspect",
      href: `/dashboard/environment?aspect=${row.environmentalAspectId}`,
      label: name ? `Aspect: ${name}` : "Linked aspect",
    });
  }
  if (row.complianceObligationId) {
    const title = obligationTitleById?.get(row.complianceObligationId);
    links.push({
      key: "obligation",
      href: `/dashboard/environment?obligation=${row.complianceObligationId}`,
      label: title ? `Obligation: ${title}` : "Linked obligation",
    });
  }
  if (row.managementReviewId) {
    const review = mgmtReviewLabelById?.get(row.managementReviewId);
    links.push({
      key: "mgmt",
      href: `/dashboard/management-review?review=${row.managementReviewId}`,
      label: review ? `Mgmt review: ${review}` : "Linked management review",
    });
  }
  if (links.length === 0) return "—";
  return (
    <ul className="max-w-[13rem] space-y-1 text-left" role="list">
      {links.map((l) => (
        <li key={l.key}>
          <Link href={l.href} className={isoRelatedLinkClass}>
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function CapaPage() {
  const verifyNotesFieldId = useId();
  const { organizationId } = useOrg();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [linkKind, setLinkKind] = useState<"none" | "incident" | "finding">("none");
  const [incidentId, setIncidentId] = useState("");
  const [auditIdForFinding, setAuditIdForFinding] = useState("");
  const [auditFindingId, setAuditFindingId] = useState("");
  const [verifyCapaId, setVerifyCapaId] = useState<string | null>(null);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [newOwnerUserId, setNewOwnerUserId] = useState("");
  const [capaInitialFlow, setCapaInitialFlow] = useState<"planned" | "pending_approval">("planned");
  const [evidenceCapaId, setEvidenceCapaId] = useState("");
  const [planApproverUserId, setPlanApproverUserId] = useState("");
  const [planExtraApprovers, setPlanExtraApprovers] = useState<string[]>([]);
  const [planSlaDays, setPlanSlaDays] = useState(7);
  const [submitApprovalCapaId, setSubmitApprovalCapaId] = useState<string | null>(null);
  const [submitApprovalApprover, setSubmitApprovalApprover] = useState("");
  const [submitApprovalApprover2, setSubmitApprovalApprover2] = useState("");
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const capaContextHint = useMemo(
    () => [title.trim(), details.trim()].filter(Boolean).join("\n").trim(),
    [title, details],
  );

  const { data: capas, isLoading } = trpc.capa.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const { data: incidents } = trpc.incident.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const { data: aspects } = trpc.aspect.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId, retry: false },
  );
  const { data: obligations } = trpc.obligation.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId, retry: false },
  );
  const { data: mgmtReviews } = trpc.managementReview.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId, retry: false },
  );

  const aspectNameById = useMemo(() => {
    if (!aspects) return null;
    return new Map(aspects.map((a) => [a.id, a.name]));
  }, [aspects]);
  const obligationTitleById = useMemo(() => {
    if (!obligations) return null;
    return new Map(obligations.map((o) => [o.id, o.title]));
  }, [obligations]);
  const mgmtReviewLabelById = useMemo(() => {
    if (!mgmtReviews) return null;
    return new Map(
      mgmtReviews.map((r) => {
        const line = r.summary.trim().split(/\n/)[0] ?? "";
        const short = line.length > 40 ? `${line.slice(0, 39)}…` : line;
        return [r.id, short || "Review"] as const;
      }),
    );
  }, [mgmtReviews]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.location.hash?.slice(1);
    if (!raw?.startsWith("capa-row-")) return;
    if (isLoading) return;
    queueMicrotask(() => {
      document.getElementById(raw)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [isLoading, capas]);

  const { data: audits } = trpc.internalAudit.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const { data: auditFindings } = trpc.internalAudit.finding.list.useQuery(
    {
      organizationId: organizationId!,
      internalAuditId: auditIdForFinding,
    },
    { enabled: !!organizationId && !!auditIdForFinding },
  );

  const { data: members } = trpc.organization.members.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const openCapaApprovals = trpc.approval.listOpenCapaRequests.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const overdueCount = useMemo(
    () => capas?.filter(isCapaOverdue).length ?? 0,
    [capas],
  );

  function memberEmail(userId: string | null): string {
    if (!userId) return "—";
    return members?.find((m) => m.userId === userId)?.email ?? userId;
  }

  const createCapa = trpc.capa.create.useMutation({
    onSuccess: () => {
      void utils.capa.list.invalidate();
      void utils.approval.listOpenCapaRequests.invalidate();
      setTitle("");
      setDetails("");
      setDueDate("");
      setIncidentId("");
      setAuditIdForFinding("");
      setAuditFindingId("");
      setLinkKind("none");
      setNewOwnerUserId("");
      setPlanApproverUserId("");
      setPlanExtraApprovers([]);
      setPlanSlaDays(7);
    },
  });

  const suggestCapaDraft = trpc.aiAssistant.proposeCapaIntakeDraft.useMutation({
    onSuccess: (out) => {
      setTitle(out.suggestedTitle);
      setDetails(out.suggestedDetails);
      setSuggestError(null);
    },
    onError: (e) => setSuggestError(e.message),
  });

  const updateStatus = trpc.capa.updateStatus.useMutation({
    onSuccess: () => {
      void utils.capa.list.invalidate();
      void utils.approval.listOpenCapaRequests.invalidate();
    },
  });

  const assignOwner = trpc.capa.assignOwner.useMutation({
    onSuccess: () => void utils.capa.list.invalidate(),
  });

  const submitCapaApproval = trpc.approval.submitCapaPlanApproval.useMutation({
    onSuccess: () => {
      void openCapaApprovals.refetch();
      void utils.capa.list.invalidate();
      setSubmitApprovalCapaId(null);
      setSubmitApprovalApprover("");
      setSubmitApprovalApprover2("");
    },
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Corrective actions (CAPA)</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Corrective action register</h1>
        <p className="text-sm text-zinc-600">
          ISO 45001 CAPA — open a row for the full workspace with sources and evidence.
        </p>
        <OrgSwitcher />
      </div>

      {overdueCount > 0 ? (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <strong>{overdueCount}</strong> corrective action(s) are past due date and not yet
          verified. Prioritize closure or update due dates.
        </div>
      ) : null}

      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <section aria-labelledby="new-capa-heading">
          <h2 id="new-capa-heading" className="text-base font-semibold text-zinc-900">
            New CAPA
          </h2>
          <p className="mt-1 text-sm text-zinc-700">
            Add a corrective action. Link to a source record when applicable (optional disclosure
            below).
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={dfSecondaryOutline}
              disabled={suggestCapaDraft.isPending || capaContextHint.length < 10}
              aria-busy={suggestCapaDraft.isPending}
              onClick={() => {
                if (!organizationId) return;
                setSuggestError(null);
                suggestCapaDraft.mutate({ organizationId, contextHint: capaContextHint });
              }}
            >
              {suggestCapaDraft.isPending ? "Suggesting…" : "Suggest wording (AI)"}
            </button>
            <span className="text-sm text-zinc-600">
              Proposal only — review before submit. Requires AI and RAG permissions.
            </span>
          </div>
          {suggestError ? (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {suggestError}
            </p>
          ) : null}
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              let due: Date | undefined;
              if (dueDate.trim()) {
                const d = new Date(`${dueDate}T12:00:00`);
                if (!Number.isNaN(d.getTime())) due = d;
              }
              createCapa.mutate({
                organizationId,
                title,
                details: details || undefined,
                dueDate: due,
                ownerUserId: newOwnerUserId || undefined,
                initialStatus: capaInitialFlow,
                ...(capaInitialFlow === "pending_approval" && planApproverUserId
                  ? {
                      approverUserIdsForPlan: [
                        planApproverUserId,
                        ...planExtraApprovers.filter((id) => id && id !== planApproverUserId),
                      ].filter((id, i, a) => a.indexOf(id) === i),
                      slaDaysPerPlanApproval: planSlaDays,
                    }
                  : {}),
                incidentId:
                  linkKind === "incident" && incidentId ? incidentId : undefined,
                auditFindingId:
                  linkKind === "finding" && auditFindingId ? auditFindingId : undefined,
              });
            }}
          >
            <div>
              <label className={labelClass} htmlFor="capa-title">
                Title
              </label>
              <input
                id="capa-title"
                required
                minLength={3}
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="capa-due">
                Target due date (optional)
              </label>
              <input
                id="capa-due"
                type="date"
                className={inputClass}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="capa-owner">
                Action owner
              </label>
              <select
                id="capa-owner"
                className={inputClass}
                value={newOwnerUserId}
                onChange={(e) => setNewOwnerUserId(e.target.value)}
              >
                <option value="">Default (creator)</option>
                {members?.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="capa-details">
                Details
                {linkKind === "none" ? (
                  <span className="font-normal text-zinc-700">
                    {" "}
                    — required for standalone (20+ chars)
                  </span>
                ) : (
                  <span className="font-normal text-zinc-700"> (optional)</span>
                )}
              </label>
              <textarea
                id="capa-details"
                required={linkKind === "none"}
                minLength={linkKind === "none" ? 20 : undefined}
                className={textareaClass}
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>

            <details className="rounded-lg border border-zinc-300 bg-zinc-50 open:border-emerald-300 open:bg-white">
              <summary className="touch-target cursor-pointer list-none rounded-md px-3 py-3 text-base font-semibold text-zinc-900 outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                Link to incident or audit finding (optional)
              </summary>
              <div className="space-y-4 border-t border-zinc-200 p-4">
                <fieldset className="space-y-2 rounded-md border border-zinc-200 bg-white p-3">
                  <legend className="px-1 text-base font-semibold text-zinc-900">
                    Link source
                  </legend>
                  <p className="mb-2 text-sm text-zinc-700">
                    Choose a link type, then select incident or audit details if needed.
                  </p>
                  <label className={radioRowClass}>
                    <input
                      type="radio"
                      name="capa-link"
                      checked={linkKind === "none"}
                      onChange={() => setLinkKind("none")}
                      className="size-4 shrink-0 border-zinc-400 text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    />
                    None (standalone — needs documented rationale)
                  </label>
                  <label className={radioRowClass}>
                    <input
                      type="radio"
                      name="capa-link"
                      checked={linkKind === "incident"}
                      onChange={() => setLinkKind("incident")}
                      className="size-4 shrink-0 border-zinc-400 text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    />
                    Incident
                  </label>
                  <label className={radioRowClass}>
                    <input
                      type="radio"
                      name="capa-link"
                      checked={linkKind === "finding"}
                      onChange={() => setLinkKind("finding")}
                      className="size-4 shrink-0 border-zinc-400 text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    />
                    Internal audit finding
                  </label>
                </fieldset>

                {linkKind === "incident" ? (
                  <div>
                    <label className={labelClass} htmlFor="capa-incident">
                      Incident
                    </label>
                    <select
                      id="capa-incident"
                      className={inputClass}
                      value={incidentId}
                      onChange={(e) => setIncidentId(e.target.value)}
                    >
                      <option value="">— Select —</option>
                      {incidents?.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.title}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {linkKind === "finding" ? (
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass} htmlFor="capa-audit">
                        Audit
                      </label>
                      <select
                        id="capa-audit"
                        className={inputClass}
                        value={auditIdForFinding}
                        onChange={(e) => {
                          setAuditIdForFinding(e.target.value);
                          setAuditFindingId("");
                        }}
                      >
                        <option value="">— Select audit —</option>
                        {audits?.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="capa-finding">
                        Finding (without CAPA yet)
                      </label>
                      <select
                        id="capa-finding"
                        className={inputClass}
                        value={auditFindingId}
                        onChange={(e) => setAuditFindingId(e.target.value)}
                        disabled={!auditIdForFinding}
                      >
                        <option value="">— Select finding —</option>
                        {auditFindings
                          ?.filter((f) => !f.correctiveActionId)
                          .map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.title}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                ) : null}
              </div>
            </details>

            <fieldset className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <legend className="px-1 text-base font-semibold text-zinc-900">
                Plan approval (separation of duties)
              </legend>
              <p className={`mb-3 ${dfMuted}`}>
                Start as <strong>pending approval</strong> when another person must accept the plan
                before work is scheduled. They approve under{" "}
                <a href="/dashboard/approvals" className="font-medium text-emerald-900 underline">
                  Approvals
                </a>
                .
              </p>
              <label className={`${radioRowClass} mb-2`}>
                <input
                  type="radio"
                  name="capa-initial-flow"
                  checked={capaInitialFlow === "planned"}
                  onChange={() => {
                    setCapaInitialFlow("planned");
                    setPlanExtraApprovers([]);
                    setPlanApproverUserId("");
                  }}
                  className="size-4 shrink-0 border-zinc-400 text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                />
                Start as planned (standard)
              </label>
              <label className={radioRowClass}>
                <input
                  type="radio"
                  name="capa-initial-flow"
                  checked={capaInitialFlow === "pending_approval"}
                  onChange={() => {
                    setCapaInitialFlow("pending_approval");
                  }}
                  className="size-4 shrink-0 border-zinc-400 text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                />
                Start pending plan approval
              </label>
              {capaInitialFlow === "pending_approval" ? (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className={labelClass} htmlFor="capa-plan-approver">
                      First plan approver
                    </label>
                    <select
                      id="capa-plan-approver"
                      className={inputClass}
                      value={planApproverUserId}
                      onChange={(e) => setPlanApproverUserId(e.target.value)}
                    >
                      <option value="">— Select member —</option>
                      {members?.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  {planExtraApprovers.map((val, idx) => (
                    <div key={idx}>
                      <label className={labelClass} htmlFor={`capa-plan-approver-${idx}`}>
                        Additional approver {idx + 2}
                      </label>
                      <select
                        id={`capa-plan-approver-${idx}`}
                        className={inputClass}
                        value={val}
                        onChange={(e) => {
                          const next = [...planExtraApprovers];
                          next[idx] = e.target.value;
                          setPlanExtraApprovers(next);
                        }}
                      >
                        <option value="">— Select —</option>
                        {members?.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {planApproverUserId &&
                  planExtraApprovers.length + 1 < 5 ? (
                    <button
                      type="button"
                      className={secondaryBtn}
                      onClick={() => setPlanExtraApprovers((s) => [...s, ""])}
                    >
                      Add another approver (max 5 total)
                    </button>
                  ) : null}
                  <div>
                    <label className={labelClass} htmlFor="capa-plan-sla">
                      Days per approval step (SLA, default 7)
                    </label>
                    <input
                      id="capa-plan-sla"
                      type="number"
                      min={1}
                      max={90}
                      className={inputClass}
                      value={planSlaDays}
                      onChange={(e) => setPlanSlaDays(Number(e.target.value) || 7)}
                    />
                  </div>
                </div>
              ) : null}
            </fieldset>

            <button
              type="submit"
              disabled={createCapa.isPending}
              aria-busy={createCapa.isPending}
              className={primaryBtn}
            >
              {createCapa.isPending ? "Saving…" : "Create CAPA"}
            </button>
          </form>
        </section>
      </div>

      {verifyCapaId ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verify-capa-title"
        >
          <div className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white p-6 shadow-lg">
            <h2 id="verify-capa-title" className="text-lg font-semibold text-zinc-900">
              Verify effectiveness
            </h2>
            <p className="mt-2 text-base text-zinc-700">
              Record how you confirmed the corrective action works (min. 20 characters). This is
              stored on the CAPA and in the audit trail.
            </p>
            <label htmlFor={verifyNotesFieldId} className={`${labelClass} mt-4`}>
              Verification notes
            </label>
            <textarea
              id={verifyNotesFieldId}
              className={`${textareaClass} min-h-[8rem]`}
              value={verifyNotes}
              onChange={(e) => setVerifyNotes(e.target.value)}
              placeholder="e.g. 30-day follow-up inspection; no recurrence; interviews with area lead…"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className={primaryBtn}
                aria-busy={updateStatus.isPending}
                disabled={updateStatus.isPending || verifyNotes.trim().length < 20}
                onClick={() => {
                  updateStatus.mutate(
                    {
                      organizationId,
                      correctiveActionId: verifyCapaId,
                      status: "verified",
                      verificationNotes: verifyNotes.trim(),
                    },
                    {
                      onSuccess: () => {
                        setVerifyCapaId(null);
                        setVerifyNotes("");
                      },
                    },
                  );
                }}
              >
                Mark verified
              </button>
              <button
                type="button"
                className={secondaryBtn}
                disabled={updateStatus.isPending}
                onClick={() => {
                  setVerifyCapaId(null);
                  setVerifyNotes("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <caption className="sr-only">
            Corrective actions for the workspace with status, due date, linked incident, environment or compliance
            sources, and actions.
          </caption>
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-800">
            <tr>
              <th scope="col" className="px-4 py-3">
                Title
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3">
                Due
              </th>
              <th scope="col" className="px-4 py-3">
                Owner
              </th>
              <th scope="col" className="px-4 py-3">
                Verified by
              </th>
              <th scope="col" className="px-4 py-3">
                Linked incident
              </th>
              <th scope="col" className="px-4 py-3">
                Environment &amp; ISO
              </th>
              <th scope="col" className="px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6">
                  <span role="status" aria-live="polite" className="text-base text-zinc-700">
                    Loading corrective actions…
                  </span>
                </td>
              </tr>
            ) : capas?.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-base text-zinc-700">
                  No corrective actions yet.
                </td>
              </tr>
            ) : (
              capas?.map((c: CapaRow) => (
                <tr
                  key={c.id}
                  id={`capa-row-${c.id}`}
                  className={isCapaOverdue(c) ? "bg-amber-50/90" : undefined}
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <Link href={`/dashboard/capa/${c.id}`} className={isoRelatedLinkClass}>
                      {c.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{c.status.replace("_", " ")}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-800">
                    {c.dueDate
                      ? new Date(c.dueDate).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="max-w-[10rem] px-4 py-3 text-zinc-800">
                    <label htmlFor={`owner-${c.id}`} className="sr-only">
                      Assign owner for {c.title}
                    </label>
                    <select
                      id={`owner-${c.id}`}
                      className="w-full max-w-full rounded-md border border-zinc-300 px-2 py-1 text-xs"
                      value={c.ownerUserId ?? ""}
                      disabled={assignOwner.isPending}
                      onChange={(e) => {
                        assignOwner.mutate({
                          organizationId,
                          correctiveActionId: c.id,
                          ownerUserId: e.target.value || null,
                        });
                      }}
                    >
                      <option value="">—</option>
                      {members?.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.email}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="max-w-[10rem] truncate px-4 py-3 text-xs text-zinc-700">
                    {c.status === "verified"
                      ? memberEmail(c.verificationPerformedByUserId ?? null)
                      : "—"}
                  </td>
                  <td className="max-w-[200px] px-4 py-3 text-zinc-800">
                    {c.incidentId ? (
                      <Link
                        href={`/dashboard/incidents/${c.incidentId}`}
                        className="font-medium text-emerald-900 underline decoration-emerald-800 underline-offset-2 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                      >
                        {incidents?.find((i) => i.id === c.incidentId)?.title ?? "Open incident"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-[14rem] px-4 py-3 text-zinc-800">
                    <CapaIsoLinks
                      row={c}
                      aspectNameById={aspectNameById}
                      obligationTitleById={obligationTitleById}
                      mgmtReviewLabelById={mgmtReviewLabelById}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {c.status === "pending_approval" &&
                    !openCapaApprovals.data?.some((r) => r.entityId === c.id) ? (
                      <div className="flex max-w-xs flex-col gap-2">
                        <p className="text-xs text-zinc-700">
                          No approver assigned yet. Submit a plan review request.
                        </p>
                        {submitApprovalCapaId === c.id ? (
                          <>
                            <select
                              className="min-h-11 w-full rounded-md border border-zinc-300 px-2 text-xs"
                              value={submitApprovalApprover}
                              onChange={(e) => setSubmitApprovalApprover(e.target.value)}
                              aria-label="First approver"
                            >
                              <option value="">— Member —</option>
                              {members?.map((m) => (
                                <option key={m.userId} value={m.userId}>
                                  {m.email}
                                </option>
                              ))}
                            </select>
                            <select
                              className="min-h-11 w-full rounded-md border border-zinc-300 px-2 text-xs"
                              value={submitApprovalApprover2}
                              onChange={(e) => setSubmitApprovalApprover2(e.target.value)}
                              aria-label="Second approver optional"
                            >
                              <option value="">Second approver (optional)</option>
                              {members?.map((m) => (
                                <option key={m.userId} value={m.userId}>
                                  {m.email}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className={tableActionBtn}
                              disabled={submitCapaApproval.isPending || !submitApprovalApprover}
                              onClick={() => {
                                const approvers = [
                                  submitApprovalApprover,
                                  submitApprovalApprover2,
                                ].filter((id, i, arr) => id && arr.indexOf(id) === i);
                                submitCapaApproval.mutate({
                                  organizationId,
                                  correctiveActionId: c.id,
                                  approvers,
                                });
                              }}
                            >
                              Send request
                            </button>
                            <button
                              type="button"
                              className="text-xs text-zinc-600 underline"
                              onClick={() => {
                                setSubmitApprovalCapaId(null);
                                setSubmitApprovalApprover("");
                                setSubmitApprovalApprover2("");
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className={tableActionBtn}
                            onClick={() => {
                              setSubmitApprovalCapaId(c.id);
                              setSubmitApprovalApprover("");
                              setSubmitApprovalApprover2("");
                            }}
                          >
                            Assign approver…
                          </button>
                        )}
                      </div>
                    ) : null}
                    {c.status === "pending_approval" &&
                    openCapaApprovals.data?.some((r) => r.entityId === c.id) ? (
                      <p className="mb-2 text-xs text-amber-900">
                        Awaiting approver in <strong>Approvals</strong>.
                      </p>
                    ) : null}
                    {c.status !== "verified" ? (
                      <button
                        type="button"
                        className={tableActionBtn}
                        aria-busy={advancingId === c.id}
                        disabled={updateStatus.isPending}
                        onClick={() => {
                          const next = nextCapaStatus(c.status);
                          if (!next) return;
                          if (next === "verified") {
                            setVerifyCapaId(c.id);
                            setVerifyNotes("");
                            return;
                          }
                          setAdvancingId(c.id);
                          updateStatus.mutate(
                            {
                              organizationId,
                              correctiveActionId: c.id,
                              status: next,
                            },
                            { onSettled: () => setAdvancingId(null) },
                          );
                        }}
                      >
                        {advanceLabel(c.status)}
                      </button>
                    ) : (
                      <span className="font-medium text-zinc-700">Done</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {capas && capas.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">CAPA evidence</h2>
          <label className="block text-sm font-semibold text-zinc-900">
            Select CAPA
            <select
              className={inputClass}
              value={evidenceCapaId || capas[0]?.id || ""}
              onChange={(e) => setEvidenceCapaId(e.target.value)}
            >
              {capas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <EhsEvidenceRegistrySection
            organizationId={organizationId}
            entityType="corrective_action"
            entityId={evidenceCapaId || capas[0]!.id}
            canRegister
          />
        </section>
      ) : null}
    </div>
  );
}
