"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { dfMuted } from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

function entityLabel(entityType: string): string {
  if (entityType === "capa") return "CAPA plan";
  if (entityType === "work_permit") return "Work permit";
  if (entityType === "incident") return "Incident";
  if (entityType === "environmental_regulatory_permit") return "Environmental permit";
  return entityType;
}

export default function ApprovalsPage() {
  const commentId = useId();
  const { organizationId } = useOrg();
  const org = organizationId!;
  const utils = trpc.useUtils();
  const [comment, setComment] = useState("");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const pending = trpc.approval.listMyPendingSteps.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );

  const escalations = trpc.approval.listEscalations.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );

  const capas = trpc.capa.list.useQuery({ organizationId: org }, { enabled: !!organizationId });
  const permits = trpc.permit.list.useQuery({ organizationId: org }, { enabled: !!organizationId });
  const envPermits = trpc.environmentalRegulatoryPermit.list.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );

  const decide = trpc.approval.decideRequest.useMutation({
    onSuccess: () => {
      void pending.refetch();
      void escalations.refetch();
      void permits.refetch();
      setActiveRequestId(null);
      void capas.refetch();
      void utils.approval.listOpenCapaRequests.invalidate();
      void utils.approval.listOpenWorkPermitRequests.invalidate();
      void utils.approval.listOpenEnvironmentalRegulatoryPermitRequests.invalidate();
      void utils.permit.list.invalidate();
      void utils.environmentalRegulatoryPermit.list.invalidate();
      setComment("");
    },
  });

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Approvals</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">My approvals</h1>
          <p className={`mt-1 ${dfMuted}`}>
            Pending serial steps assigned to you. Decisions are written to the audit trail.
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-base">
          <caption className="sr-only">Pending approval steps for the signed-in user</caption>
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-800">
            <tr>
              <th scope="col" className="px-4 py-3">
                Item
              </th>
              <th scope="col" className="px-4 py-3">
                Type
              </th>
              <th scope="col" className="px-4 py-3">
                Due
              </th>
              <th scope="col" className="px-4 py-3">
                Requested
              </th>
              <th scope="col" className="px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {pending.isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6">
                  <span role="status" aria-live="polite" className="text-zinc-700">
                    Loading…
                  </span>
                </td>
              </tr>
            ) : pending.data?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-zinc-700">
                  No pending approvals for your account.
                </td>
              </tr>
            ) : (
              pending.data?.map(({ step, request }) => {
                const expanded = activeRequestId === request.id;
                const due = step.dueAt ? new Date(step.dueAt) : null;
                const overdue = due && due < new Date();

                const capaTitle =
                  request.entityType === "capa"
                    ? capas.data?.find((c) => c.id === request.entityId)?.title ?? request.entityId.slice(0, 8)
                    : null;
                const permitTitle =
                  request.entityType === "work_permit"
                    ? permits.data?.find((p) => p.id === request.entityId)?.title ?? request.entityId.slice(0, 8)
                    : null;
                const envPermitTitle =
                  request.entityType === "environmental_regulatory_permit"
                    ? envPermits.data?.find((p) => p.id === request.entityId)?.title ??
                      request.entityId.slice(0, 8)
                    : null;

                const primaryLabel =
                  request.entityType === "capa"
                    ? capaTitle
                    : request.entityType === "work_permit"
                      ? permitTitle
                      : request.entityType === "environmental_regulatory_permit"
                        ? envPermitTitle
                      : request.entityType === "incident"
                        ? `Incident ${request.entityId.slice(0, 8)}`
                        : request.entityId.slice(0, 8);

                const itemHref =
                  request.entityType === "work_permit"
                    ? `/dashboard/permits/${request.entityId}`
                    : request.entityType === "capa"
                      ? "/dashboard/capa"
                      : request.entityType === "environmental_regulatory_permit"
                        ? `/dashboard/environmental-permits/${request.entityId}`
                      : "/dashboard/incidents";

                return (
                  <tr key={step.id}>
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      <Link href={itemHref} className="text-emerald-900 underline">
                        {primaryLabel}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-800">{entityLabel(request.entityType)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-800">
                      {due
                        ? `${due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}${overdue ? " (overdue)" : ""}`
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-800">
                      {new Date(request.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {!expanded ? (
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => {
                            setActiveRequestId(request.id);
                            setComment("");
                          }}
                        >
                          Review
                        </button>
                      ) : (
                        <div
                          className="flex max-w-md flex-col gap-2"
                          data-stress-action-region="decide-approve-reject"
                        >
                          <label htmlFor={commentId} className="text-sm font-medium text-zinc-900">
                            Comment (optional)
                          </label>
                          <textarea
                            id={commentId}
                            rows={2}
                            className="min-h-[4rem] rounded-md border border-zinc-300 px-3 py-2 text-base"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn-primary"
                              disabled={decide.isPending}
                              aria-busy={decide.isPending}
                              onClick={() =>
                                decide.mutate({
                                  organizationId: org,
                                  requestId: request.id,
                                  decision: "approved",
                                  comment: comment.trim() || undefined,
                                })
                              }
                            >
                              {request.entityType === "capa"
                                ? "Approve plan"
                                : request.entityType === "work_permit"
                                  ? "Authorize work"
                                  : request.entityType === "environmental_regulatory_permit"
                                    ? "Approve activation"
                                  : "Approve"}
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              disabled={decide.isPending}
                              onClick={() =>
                                decide.mutate({
                                  organizationId: org,
                                  requestId: request.id,
                                  decision: "rejected",
                                  comment: comment.trim() || undefined,
                                })
                              }
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              className="min-h-11 rounded-md border border-zinc-200 px-3 text-base text-zinc-800"
                              onClick={() => setActiveRequestId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {escalations.data && escalations.data.length > 0 ? (
        <section
          className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-base text-amber-950 shadow-sm"
          aria-labelledby="esc-h"
        >
          <h2 id="esc-h" className="text-base font-semibold">
            Overdue approval escalations (recorded)
          </h2>
          <p className={`mt-1 text-sm ${dfMuted}`}>
            Cron records overdue steps here for visibility. Notifications are not sent in this MVP.
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1">
            {escalations.data.slice(0, 8).map((e) => (
              <li key={e.id}>
                {e.detectedAt ? new Date(e.detectedAt).toLocaleString() : "—"} — {e.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
