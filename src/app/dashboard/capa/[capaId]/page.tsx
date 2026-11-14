"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useId, useState } from "react";
import { CapaSourcePanel, CapaStatusStepper } from "@/components/dashboard/capa-source-panel";
import { EhsEvidenceRegistrySection } from "@/components/dashboard/ehs-evidence-registry-section";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfControl,
  dfHelperXs,
  dfInlineNavLink,
  dfMuted,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

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

export default function CapaDetailPage() {
  return <Suspense fallback={<p role="status">Loading corrective action…</p>}><CapaDetailContent /></Suspense>;
}

function CapaDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const incidentFilter = searchParams.get("incidentFilter") ?? "";
  const capaId = typeof params.capaId === "string" ? params.capaId : null;
  const { organizationId } = useOrg();
  const org = organizationId ?? "";
  const verifyNotesId = useId();
  const [verifyNotes, setVerifyNotes] = useState("");
  const [showVerify, setShowVerify] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, error: loadError } = trpc.capa.get.useQuery(
    { organizationId: org, correctiveActionId: capaId! },
    { enabled: !!organizationId && !!capaId },
  );

  const { data: members } = trpc.organization.members.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );

  const updateStatus = trpc.capa.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.capa.get.invalidate({ organizationId: org, correctiveActionId: capaId! });
      void utils.capa.list.invalidate({ organizationId: org });
      setSavedMessage("Corrective action status saved.");
      setShowVerify(false);
      setVerifyNotes("");
    },
  });

  const assignOwner = trpc.capa.assignOwner.useMutation({
    onSuccess: () => {
      void utils.capa.get.invalidate({ organizationId: org, correctiveActionId: capaId! });
      void utils.capa.list.invalidate({ organizationId: org });
    },
  });

  if (!organizationId || !capaId) {
    return (
      <div className="space-y-4">
        <p className="text-zinc-700">Missing corrective action.</p>
        <OrgSwitcher />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-red-800">{loadError.message}</p>
        <Link href="/dashboard/capa" className={dfInlineNavLink}>Back to corrective actions</Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <span className="text-zinc-600">Loading corrective action…</span>
      </div>
    );
  }

  const { capa, sources, hasOpenApproval } = data;
  const next = nextCapaStatus(capa.status);
  const ownerEmail =
    members?.find((m) => m.userId === capa.ownerUserId)?.email ?? capa.ownerUserId ?? "Unassigned";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">
            <Link href="/dashboard/capa" className={dfInlineNavLink}>
              Corrective action register
            </Link>
            <span aria-hidden> / </span>
            {capa.title.slice(0, 48)}
            {capa.title.length > 48 ? "…" : ""}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{capa.title}</h1>
          <p data-capa-status={capa.status} className={`mt-1 capitalize ${dfMuted}`}>{capa.status.replaceAll("_", " ")}</p>
        </div>
        <Link href="/dashboard/capa" className="btn-secondary">Back to corrective actions</Link>
      </div>

      <nav aria-label="Corrective action sections" className="flex flex-wrap gap-x-5 gap-y-1 border-y border-border py-2">
        <a href="#action-source" className={dfInlineNavLink}>Source record</a>
        <a href="#action-progress" className={dfInlineNavLink}>Progress &amp; verification</a>
        <a href="#action-evidence" className={dfInlineNavLink}>Evidence</a>
      </nav>

      <CapaSourcePanel sources={sources} hasOpenApproval={hasOpenApproval} incidentFilter={incidentFilter} />

      {savedMessage ? <p role="status" className="text-sm text-foreground">{savedMessage}</p> : null}

      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className={dfSectionHeading}>Details</h2>
        {capa.details ? (
          <p className="mt-2 whitespace-pre-wrap text-base text-zinc-800">{capa.details}</p>
        ) : (
          <p className={`mt-2 ${dfMuted}`}>No details recorded.</p>
        )}
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-zinc-700">Owner</dt>
            <dd className="text-zinc-900">{ownerEmail}</dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-700">Due date</dt>
            <dd className="text-zinc-900">
              {capa.dueDate ? new Date(capa.dueDate).toLocaleDateString() : "—"}
            </dd>
          </div>
        </dl>
        {capa.status === "verified" && capa.verificationNotes ? (
          <div className="mt-4 rounded-md border border-emerald-100 bg-emerald-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
              Verification notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">{capa.verificationNotes}</p>
          </div>
        ) : null}
      </div>

      <section id="action-progress" aria-labelledby="action-progress-heading" className="scroll-mt-44 sm:scroll-mt-24 rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 id="action-progress-heading" className={dfSectionHeading}>Progress &amp; verification</h2>
        <div className="mt-4"><CapaStatusStepper status={capa.status} /></div>
        <p className={`mt-3 ${dfMuted}`}>
          {capa.status === "verified"
            ? "This action has been verified. Its evidence and verification notes remain available on this record."
            : capa.status === "completed"
              ? "Work is complete. A person must review effectiveness and record verification notes before this action is verified."
              : capa.status === "pending_approval"
                ? "The plan is awaiting approval before work can begin."
                : capa.status === "in_progress"
                  ? "Work is in progress. Record supporting evidence, then mark the work complete when ready for verification."
                  : "The action is planned. Confirm ownership and begin work when ready."}
        </p>
      </section>

      {next && capa.status !== "verified" ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
          <h2 className={dfSectionHeading}>Workflow actions</h2>
          {updateStatus.error ? (
            <p role="alert" className="mt-3 text-sm text-red-800">{updateStatus.error.message}</p>
          ) : null}
          {capa.status === "completed" && showVerify ? (
            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                setSavedMessage(null);
                updateStatus.mutate({
                  organizationId: org,
                  correctiveActionId: capa.id,
                  status: "verified",
                  verificationNotes: verifyNotes,
                });
              }}
            >
              <label className="block text-sm font-semibold text-zinc-900" htmlFor={verifyNotesId}>
                Effectiveness / verification notes (min 20 characters)
              </label>
              <textarea
                id={verifyNotesId}
                required
                minLength={20}
                rows={4}
                className={dfControl}
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={updateStatus.isPending}
                  aria-busy={updateStatus.isPending}
                  className="btn-primary"
                >
                  {updateStatus.isPending ? "Saving…" : "Confirm verification"}
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold"
                  disabled={updateStatus.isPending}
                  onClick={() => setShowVerify(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="btn-primary mt-3"
              disabled={
                updateStatus.isPending ||
                (capa.status === "pending_approval" && hasOpenApproval)
              }
              aria-busy={updateStatus.isPending}
              onClick={() => {
                if (capa.status === "completed") {
                  setShowVerify(true);
                  return;
                }
                if (!next) return;
                setSavedMessage(null);
                updateStatus.mutate({
                  organizationId: org,
                  correctiveActionId: capa.id,
                  status: next,
                });
              }}
            >
              {advanceLabel(capa.status)}
            </button>
          )}
          {capa.status === "pending_approval" && hasOpenApproval ? (
            <p className={`mt-2 ${dfHelperXs}`}>
              Complete plan approval in{" "}
              <Link href="/dashboard/approvals" className={dfInlineNavLink}>
                Approvals
              </Link>{" "}
              before advancing to planned.
            </p>
          ) : null}
        </div>
      ) : null}

      {members && capa.status !== "verified" ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <label className="block text-sm font-semibold text-zinc-900" htmlFor="capa-owner-select">
            Reassign owner
          </label>
          <select
            id="capa-owner-select"
            className={`mt-1 ${dfControl}`}
            value={capa.ownerUserId ?? ""}
            disabled={assignOwner.isPending}
            onChange={(e) =>
              assignOwner.mutate({
                organizationId: org,
                correctiveActionId: capa.id,
                ownerUserId: e.target.value || null,
              })
            }
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.email ?? m.userId}
              </option>
            ))}
          </select>
          {assignOwner.error ? (
            <p role="alert" className="mt-2 text-sm text-red-800">{assignOwner.error.message}</p>
          ) : null}
        </div>
      ) : null}

      <div id="action-evidence" className="scroll-mt-44 sm:scroll-mt-24">
        <EhsEvidenceRegistrySection
          organizationId={org}
          entityType="corrective_action"
          entityId={capa.id}
          canRegister
        />
      </div>
    </div>
  );
}
