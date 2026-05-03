"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { dfMuted, dfPrimarySubmit, dfSecondaryOutline } from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

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

  const capas = trpc.capa.list.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );

  const decide = trpc.approval.decideRequest.useMutation({
    onSuccess: () => {
      void pending.refetch();
      setActiveRequestId(null);
      void capas.refetch();
      void utils.approval.listOpenCapaRequests.invalidate();
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
            Open CAPA plan reviews assigned to you. Decisions are written to the audit trail.
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
                CAPA
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
                <td colSpan={3} className="px-4 py-6">
                  <span role="status" aria-live="polite" className="text-zinc-700">
                    Loading…
                  </span>
                </td>
              </tr>
            ) : pending.data?.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-zinc-700">
                  No pending approvals for your account.
                </td>
              </tr>
            ) : (
              pending.data?.map(({ step, request }) => {
                const capaTitle =
                  capas.data?.find((c) => c.id === request.entityId)?.title ?? request.entityId.slice(0, 8);
                const expanded = activeRequestId === request.id;
                return (
                  <tr key={step.id}>
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      <Link href="/dashboard/capa" className="text-emerald-900 underline">
                        {capaTitle}
                      </Link>
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
                          className={dfPrimarySubmit}
                          onClick={() => {
                            setActiveRequestId(request.id);
                            setComment("");
                          }}
                        >
                          Review
                        </button>
                      ) : (
                        <div className="flex max-w-md flex-col gap-2">
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
                              className={dfPrimarySubmit}
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
                              Approve plan
                            </button>
                            <button
                              type="button"
                              className={dfSecondaryOutline}
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
    </div>
  );
}
