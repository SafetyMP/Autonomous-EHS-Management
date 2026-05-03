"use client";

import type { inferRouterOutputs } from "@trpc/server";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
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
import type { AppRouter } from "@/server/trpc/root";
import { trpc } from "@/trpc/react";

const inputClass =
  "mt-1 min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 sm:text-sm";

const types = ["hot_work", "confined_space", "work_at_height", "other"] as const;

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type PermitRow = NonNullable<inferRouterOutputs<AppRouter>["permit"]["get"]>;

function PermitEditor({
  permitIdParam,
  organizationId,
  row,
}: {
  permitIdParam: string;
  organizationId: string;
  row: PermitRow;
}) {
  const formId = useId();
  const commentId = useId();

  const [title, setTitle] = useState(row.title);
  const [permitType, setPermitType] = useState<(typeof types)[number]>(
    types.includes(row.permitType as (typeof types)[number])
      ? (row.permitType as (typeof types)[number])
      : "other",
  );
  const [siteId, setSiteId] = useState(row.siteId ?? "");
  const [validFrom, setValidFrom] = useState(() => toDateInput(new Date(row.validFrom)));
  const [validTo, setValidTo] = useState(() => toDateInput(new Date(row.validTo)));
  const [workSummary, setWorkSummary] = useState(row.workSummary);
  const [hazardsControls, setHazardsControls] = useState(row.hazardsControls ?? "");
  const [approverUserId, setApproverUserId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [approveComment, setApproveComment] = useState("");
  const [dirty, setDirty] = useState(false);
  const [submitOutboxMsg, setSubmitOutboxMsg] = useState<string | null>(null);

  const online = useNavigatorOnline();

  const { data: sites } = trpc.organization.sites.useQuery(
    { organizationId },
    { enabled: !!organizationId },
  );

  const { data: members } = trpc.organization.members.useQuery(
    { organizationId },
    { enabled: !!organizationId },
  );

  const utils = trpc.useUtils();

  const pendingMine = trpc.approval.listMyPendingSteps.useQuery(
    { organizationId },
    { enabled: !!organizationId },
  );

  const myPendingForThis = useMemo(
    () =>
      pendingMine.data?.find(
        (r) => r.request.entityType === "work_permit" && r.request.entityId === row.id,
      ) ?? null,
    [pendingMine.data, row.id],
  );

  const updateMut = trpc.permit.update.useMutation({
    onSuccess: async () => {
      await utils.permit.get.invalidate({ organizationId, permitId: permitIdParam });
      await utils.permit.list.invalidate();
      setDirty(false);
    },
  });

  const submitMut = trpc.permit.submitForApproval.useMutation({
    onSuccess: async () => {
      setSubmitOutboxMsg(null);
      await utils.permit.get.invalidate({ organizationId, permitId: permitIdParam });
      await utils.permit.list.invalidate();
      await utils.approval.listOpenWorkPermitRequests.invalidate();
      await utils.approval.listMyPendingSteps.invalidate();
    },
  });

  const decideMut = trpc.approval.decideRequest.useMutation({
    onSuccess: async () => {
      await utils.permit.get.invalidate({ organizationId, permitId: permitIdParam });
      await utils.approval.listMyPendingSteps.invalidate();
    },
  });

  const statusMut = trpc.permit.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.permit.get.invalidate({ organizationId, permitId: permitIdParam });
      await utils.permit.list.invalidate();
    },
  });

  const canEditDraft = ["draft", "pending_approval"].includes(row.status);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">
            <Link href="/dashboard/permits" className="text-emerald-800 underline">
              Permits
            </Link>
            <span aria-hidden>/</span> {row.title}
          </p>
          <h1 className={`mt-1 ${dfSectionHeading}`}>{row.title}</h1>
          <p className={`mt-1 capitalize ${dfMuted}`}>
            Status: {row.status.replaceAll("_", " ")} · Type: {row.permitType.replaceAll("_", " ")}
          </p>
          {myPendingForThis ? (
            <p className="mt-2 text-sm font-semibold text-amber-900">
              Action required: you have a pending approval step for this permit.
            </p>
          ) : null}
        </div>
        <OrgSwitcher />
      </div>

      {myPendingForThis ? (
        <section
          className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm"
          aria-labelledby={`${commentId}-h`}
        >
          <h2 id={`${commentId}-h`} className="text-base font-semibold text-emerald-950">
            Your approval decision
          </h2>
          <label htmlFor={commentId} className={`mt-3 block ${dfLabel}`}>
            Comment (optional)
          </label>
          <textarea
            id={commentId}
            rows={2}
            className={`${inputClass} min-h-[4rem]`}
            value={approveComment}
            onChange={(e) => setApproveComment(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={dfPrimarySubmit}
              disabled={decideMut.isPending}
              onClick={() =>
                decideMut.mutate({
                  organizationId,
                  requestId: myPendingForThis.request.id,
                  decision: "approved",
                  comment: approveComment.trim() || undefined,
                })
              }
            >
              Approve authorization
            </button>
            <button
              type="button"
              className={dfSecondaryOutline}
              disabled={decideMut.isPending}
              onClick={() =>
                decideMut.mutate({
                  organizationId,
                  requestId: myPendingForThis.request.id,
                  decision: "rejected",
                  comment: approveComment.trim() || undefined,
                })
              }
            >
              Reject
            </button>
            <Link
              href="/dashboard/approvals"
              className="inline-flex min-h-11 items-center rounded-md border border-zinc-300 px-3 py-2 text-base text-zinc-800"
            >
              Open approvals inbox
            </Link>
          </div>
        </section>
      ) : row.status === "pending_approval" ? (
        <p className="text-sm text-zinc-700">
          <Link href="/dashboard/approvals" className="font-medium text-emerald-900 underline">
            Approvals
          </Link>{" "}
          inbox — awaiting serial approvers.
        </p>
      ) : null}

      <form
        id={formId}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canEditDraft) return;
          const vf = new Date(`${validFrom}T08:00:00`);
          const vt = new Date(`${validTo}T17:00:00`);
          updateMut.mutate({
            organizationId,
            permitId: row.id,
            title: title.trim(),
            permitType,
            siteId: siteId || null,
            validFrom: vf,
            validTo: vt,
            workSummary: workSummary.trim(),
            hazardsControls: hazardsControls.trim() || null,
          });
        }}
      >
        <div>
          <label className={dfLabel} htmlFor={`${formId}-title`}>
            Title
          </label>
          <input
            id={`${formId}-title`}
            required
            disabled={!canEditDraft}
            className={inputClass}
            value={title}
            onChange={(e) => {
              setDirty(true);
              setTitle(e.target.value);
            }}
          />
        </div>

        <div>
          <label className={dfLabel} htmlFor={`${formId}-type`}>
            Permit type
          </label>
          <select
            id={`${formId}-type`}
            disabled={!canEditDraft}
            className={inputClass}
            value={permitType}
            onChange={(e) => {
              setDirty(true);
              setPermitType(e.target.value as (typeof types)[number]);
            }}
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
            disabled={!canEditDraft}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={dfLabel} htmlFor={`${formId}-vf`}>
              Valid from
            </label>
            <input
              id={`${formId}-vf`}
              type="date"
              required
              disabled={!canEditDraft}
              className={inputClass}
              value={validFrom}
              onChange={(e) => {
                setDirty(true);
                setValidFrom(e.target.value);
              }}
            />
          </div>
          <div>
            <label className={dfLabel} htmlFor={`${formId}-vt`}>
              Valid to
            </label>
            <input
              id={`${formId}-vt`}
              type="date"
              required
              disabled={!canEditDraft}
              className={inputClass}
              value={validTo}
              onChange={(e) => {
                setDirty(true);
                setValidTo(e.target.value);
              }}
            />
          </div>
        </div>

        <div>
          <label className={dfLabel} htmlFor={`${formId}-work`}>
            Work summary
          </label>
          <textarea
            id={`${formId}-work`}
            required
            disabled={!canEditDraft}
            rows={5}
            className={`${inputClass} min-h-[8rem]`}
            value={workSummary}
            onChange={(e) => {
              setDirty(true);
              setWorkSummary(e.target.value);
            }}
          />
        </div>

        <div>
          <label className={dfLabel} htmlFor={`${formId}-hz`}>
            Hazards &amp; controls
          </label>
          <textarea
            id={`${formId}-hz`}
            disabled={!canEditDraft}
            rows={3}
            className={`${inputClass} min-h-[5rem]`}
            value={hazardsControls}
            onChange={(e) => {
              setDirty(true);
              setHazardsControls(e.target.value);
            }}
          />
        </div>

        {canEditDraft ? (
          <button
            type="submit"
            className={dfPrimarySubmit}
            disabled={updateMut.isPending || !dirty}
            aria-busy={updateMut.isPending}
          >
            Save changes
          </button>
        ) : null}
      </form>

      {row.status === "draft" ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Submit for approval</h2>
          <p className={`mt-1 ${dfMuted}`}>Pick one org member who can authorize this work.</p>
          {submitOutboxMsg ? (
            <p role="status" className="mt-2 text-sm text-amber-900">
              {submitOutboxMsg}
            </p>
          ) : null}
          <div className="mt-4 max-w-md">
            <label className={dfLabel} htmlFor={`${formId}-ap`}>
              Approver
            </label>
            <select
              id={`${formId}-ap`}
              className={inputClass}
              value={approverUserId}
              onChange={(e) => setApproverUserId(e.target.value)}
            >
              <option value="">Choose…</option>
              {members?.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.email}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={`${dfPrimarySubmit} mt-4`}
            disabled={submitMut.isPending || !approverUserId}
            onClick={() =>
              void (async () => {
                if (!online && isFieldOutboxEnabled()) {
                  setSubmitOutboxMsg(null);
                  try {
                    await enqueueFieldOutbox({
                      procedure: "permit.submitForApproval",
                      organizationId,
                      payloadJson: JSON.stringify({
                        organizationId,
                        permitId: row.id,
                        approvers: [approverUserId],
                      }),
                    });
                    setSubmitOutboxMsg(
                      "Saved in this browser. Submission will send when you are back online.",
                    );
                  } catch {
                    setSubmitOutboxMsg("Could not queue offline submission.");
                  }
                  return;
                }
                submitMut.mutate({
                  organizationId,
                  permitId: row.id,
                  approvers: [approverUserId],
                });
              })()
            }
          >
            Submit for approval
          </button>
        </section>
      ) : null}

      {row.status === "draft" ? (
        <button
          type="button"
          className={`${dfSecondaryOutline}`}
          onClick={() =>
            statusMut.mutate({
              organizationId,
              permitId: row.id,
              toStatus: "cancelled",
              cancelReason: "Withdrawn before submission",
            })
          }
        >
          Discard draft (cancel)
        </button>
      ) : null}

      {row.status === "pending_approval" ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Withdraw submission</h2>
          <p className={`mt-1 ${dfMuted}`}>
            Cancelling voids any open authorization request associated with this permit.
          </p>
          <div className="mt-4">
            <label className={dfLabel} htmlFor={`${formId}-wcr`}>
              Reason (optional)
            </label>
            <input
              id={`${formId}-wcr`}
              className={inputClass}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={`${dfSecondaryOutline} mt-4`}
            disabled={statusMut.isPending}
            onClick={() =>
              statusMut.mutate({
                organizationId,
                permitId: row.id,
                toStatus: "cancelled",
                cancelReason: cancelReason.trim() || "Submission withdrawn",
              })
            }
          >
            Cancel permit (withdraw)
          </button>
        </section>
      ) : null}

      {row.status === "active" ? (
        <section className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Complete or stop work</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={dfPrimarySubmit}
              disabled={statusMut.isPending}
              onClick={() => statusMut.mutate({ organizationId, permitId: row.id, toStatus: "completed" })}
            >
              Mark completed
            </button>
            <button
              type="button"
              className={dfSecondaryOutline}
              disabled={statusMut.isPending}
              onClick={() => statusMut.mutate({ organizationId, permitId: row.id, toStatus: "expired" })}
            >
              Mark expired early
            </button>
          </div>
          <div>
            <label className={dfLabel} htmlFor={`${formId}-cr`}>
              Cancel reason
            </label>
            <input
              id={`${formId}-cr`}
              className={inputClass}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 rounded-md border border-red-300 bg-white px-4 py-2 text-base font-medium text-red-800"
            disabled={statusMut.isPending}
            onClick={() =>
              statusMut.mutate({
                organizationId,
                permitId: row.id,
                toStatus: "cancelled",
                cancelReason: cancelReason.trim() || "Cancelled by user",
              })
            }
          >
            Cancel permit
          </button>
        </section>
      ) : null}
    </div>
  );
}

export default function PermitDetailPage() {
  const params = useParams();
  const permitIdParam = typeof params.permitId === "string" ? params.permitId : null;
  const { organizationId } = useOrg();
  const org = organizationId ?? "";

  const { data: row, isLoading } = trpc.permit.get.useQuery(
    { organizationId: org, permitId: permitIdParam! },
    { enabled: !!organizationId && !!permitIdParam },
  );

  if (!organizationId || !permitIdParam) {
    return (
      <div className="space-y-4">
        <p className="text-zinc-700">Missing organization or permit.</p>
        <OrgSwitcher />
      </div>
    );
  }

  if (isLoading || !row) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <span className="text-zinc-600">Loading permit…</span>
      </div>
    );
  }

  const editorKey = `${permitIdParam}-${row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt)}`;

  return <PermitEditor key={editorKey} organizationId={org} permitIdParam={permitIdParam} row={row} />;
}
