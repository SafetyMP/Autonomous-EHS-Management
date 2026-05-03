"use client";

import { useMemo, useState } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfControl,
  dfControlMt,
  dfHelperXs,
  dfLabel,
  dfMuted,
  dfPrimarySubmit,
  dfSecondaryOutline,
  dfSectionHeading,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

type ReviewRow = {
  id: string;
  reviewDate: Date;
  summary: string;
  actionItems: string | null;
  nextReviewDue: Date | null;
};

function resolveReviewId(
  rows: { id: string }[] | undefined,
  picked: string | null,
): string | null {
  if (!rows?.length) return null;
  if (picked && rows.some((r) => r.id === picked)) return picked;
  return rows[0]!.id;
}

export default function ManagementReviewPage() {
  const { organizationId } = useOrg();

  const { data } = trpc.managementReview.list.useQuery(
    { organizationId: organizationId! },
    { enabled: !!organizationId },
  );

  const [reviewDate, setReviewDate] = useState("");
  const [summary, setSummary] = useState("");
  const [actionItemsCreate, setActionItemsCreate] = useState("");
  const [nextDueCreate, setNextDueCreate] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const create = trpc.managementReview.create.useMutation({
    onSuccess: (row) => {
      void utils.managementReview.list.invalidate();
      setReviewDate("");
      setSummary("");
      setActionItemsCreate("");
      setNextDueCreate("");
      setSelectedId(row.id);
    },
  });

  const update = trpc.managementReview.update.useMutation({
    onSuccess: () => void utils.managementReview.list.invalidate(),
  });

  const resolvedReviewId = useMemo(
    () => resolveReviewId(data, selectedId),
    [data, selectedId],
  );
  const selected: ReviewRow | null =
    resolvedReviewId && data
      ? (data.find((r) => r.id === resolvedReviewId) as ReviewRow | undefined) ?? null
      : null;

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Management review</h1>
        <OrgSwitcher />
      </div>
    );
  }

  const rows = (data ?? []) as ReviewRow[];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Management review (Clause 9.3)</h1>
          <p className={dfMuted}>ISO 45001 / 14001 management review records</p>
        </div>
        <OrgSwitcher />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className={dfSectionHeading}>Create review</h2>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate({
                organizationId,
                reviewDate: new Date(reviewDate),
                summary,
                actionItems: actionItemsCreate.trim() || undefined,
                nextReviewDue: nextDueCreate ? new Date(nextDueCreate) : undefined,
              });
            }}
          >
            <div>
              <label className={dfLabel} htmlFor="mr-review-date">
                Meeting / review date
              </label>
              <input
                id="mr-review-date"
                required
                type="date"
                className={dfControlMt}
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
              />
            </div>
            <div>
              <label className={dfLabel} htmlFor="mr-summary">
                Summary &amp; minutes (min. 10 characters)
              </label>
              <textarea
                id="mr-summary"
                required
                minLength={10}
                rows={6}
                className={dfControlMt}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Decisions, resource needs, context from performance…"
              />
            </div>
            <div>
              <label className={dfLabel} htmlFor="mr-actions-create">
                Action items / outputs (optional)
              </label>
              <textarea
                id="mr-actions-create"
                rows={3}
                className={dfControlMt}
                value={actionItemsCreate}
                onChange={(e) => setActionItemsCreate(e.target.value)}
              />
            </div>
            <div>
              <label className={dfLabel} htmlFor="mr-next-due-create">
                Next review due (optional)
              </label>
              <input
                id="mr-next-due-create"
                type="date"
                className={dfControlMt}
                value={nextDueCreate}
                onChange={(e) => setNextDueCreate(e.target.value)}
              />
            </div>
            <button type="submit" disabled={create.isPending} aria-busy={create.isPending} className={dfPrimarySubmit}>
              Save review
            </button>
          </form>
        </section>

        <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className={dfSectionHeading}>Review history</h2>
          {rows.length > 0 ? (
            <div className="space-y-3">
              <label className={dfLabel} htmlFor="review-select">
                Select review
              </label>
              <select id="review-select" className={dfControl}
                value={resolvedReviewId ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {new Date(r.reviewDate).toLocaleDateString()} · {r.summary.slice(0, 48)}
                    {r.summary.length > 48 ? "…" : ""}
                  </option>
                ))}
              </select>
              {selected ? (
                <div className="rounded-md border border-zinc-100 bg-zinc-50 p-3 text-base text-zinc-900">
                  <p className={dfHelperXs}>
                    Meeting date {new Date(selected.reviewDate).toLocaleDateString()}
                    {selected.nextReviewDue ? (
                      <> · Next due {new Date(selected.nextReviewDue).toLocaleDateString()}</>
                    ) : null}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap leading-relaxed">{selected.summary}</p>
                  {selected.actionItems ? (
                    <p className={`mt-2 whitespace-pre-wrap ${dfMuted}`}>{selected.actionItems}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className={`text-base ${dfMuted}`}>No reviews yet.</p>
          )}
        </section>
      </div>

      {selected ? (
        <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className={dfSectionHeading}>Amend selected review</h2>
          <AmendForm
            key={selected.id}
            organizationId={organizationId}
            review={selected}
            onSave={() => void utils.managementReview.list.invalidate()}
            update={update}
          />
        </section>
      ) : null}
    </div>
  );
}

function AmendForm({
  organizationId,
  review,
  onSave,
  update,
}: {
  organizationId: string;
  review: ReviewRow;
  onSave: () => void;
  update: {
    isPending: boolean;
    mutate: (
      vars: {
        organizationId: string;
        reviewId: string;
        summary: string;
        actionItems?: string | null;
        nextReviewDue?: Date | null;
        reviewDate?: Date;
      },
      opts?: { onSuccess?: () => void },
    ) => void;
  };
}) {
  const [summary, setSummary] = useState(review.summary);
  const [actionItems, setActionItems] = useState(review.actionItems ?? "");
  const [reviewDateStr, setReviewDateStr] = useState(
    review.reviewDate.toISOString().slice(0, 10),
  );
  const [nextDueStr, setNextDueStr] = useState(
    review.nextReviewDue ? review.nextReviewDue.toISOString().slice(0, 10) : "",
  );

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate(
          {
            organizationId,
            reviewId: review.id,
            summary,
            actionItems: actionItems.trim() || null,
            nextReviewDue: nextDueStr ? new Date(nextDueStr) : null,
            reviewDate: new Date(reviewDateStr),
          },
          { onSuccess: onSave },
        );
      }}
    >
      <div>
        <label className={dfLabel} htmlFor="mr-amend-date">
          Review date
        </label>
        <input
          id="mr-amend-date"
          required
          type="date"
          className={dfControlMt}
          value={reviewDateStr}
          onChange={(e) => setReviewDateStr(e.target.value)}
        />
      </div>
      <div>
        <label className={dfLabel} htmlFor="mr-amend-summary">
          Summary / minutes (min. 10 characters)
        </label>
        <textarea
          id="mr-amend-summary"
          required
          minLength={10}
          rows={6}
          className={dfControlMt}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>
      <div>
        <label className={dfLabel} htmlFor="mr-amend-actions">
          Action items / outputs (optional)
        </label>
        <textarea
          id="mr-amend-actions"
          rows={3}
          className={dfControlMt}
          value={actionItems}
          onChange={(e) => setActionItems(e.target.value)}
        />
      </div>
      <div>
        <label className={dfLabel} htmlFor="mr-amend-next-due">
          Next review due (optional)
        </label>
        <input
          id="mr-amend-next-due"
          type="date"
          className={dfControlMt}
          value={nextDueStr}
          onChange={(e) => setNextDueStr(e.target.value)}
        />
      </div>
      <button type="submit" disabled={update.isPending} aria-busy={update.isPending} className={dfSecondaryOutline}>
        Update review
      </button>
    </form>
  );
}