"use client";

import { useState } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import {
  dfControl,
  dfMuted,
  dfPrimarySubmit,
  dfSectionHeading,
  dfLabel,
} from "@/lib/dashboard-field-styles";
import { trpc } from "@/trpc/react";

/**
 * DSAR / privacy **intake** only — not legal advice, not an automated subject export.
 * See docs/DSAR_PROCESS.md and discuss workflow with counsel / DPO.
 */
export default function PrivacyRequestsPage() {
  const { organizationId } = useOrg();
  const org = organizationId!;
  const listQuery = trpc.compliance.dsar.list.useQuery(
    { organizationId: org },
    { enabled: !!organizationId },
  );
  const createMut = trpc.compliance.dsar.create.useMutation({
    onSuccess: () => void listQuery.refetch(),
  });
  const statusMut = trpc.compliance.dsar.updateStatus.useMutation({
    onSuccess: () => void listQuery.refetch(),
  });

  const [contact, setContact] = useState("");
  const [reqType, setReqType] = useState("access");
  const [notes, setNotes] = useState("");

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Privacy requests</h1>
        <OrgSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Privacy / data subject requests</h1>
          <p className={dfMuted}>
            Record intakes for your privacy register. This does not replace legal review, identity
            verification, or secure delivery. See <code className="rounded bg-zinc-100 px-1">docs/DSAR_PROCESS.md</code>.
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className={dfSectionHeading}>New intake</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate({
              organizationId: org,
              subjectContact: contact,
              requestType: reqType,
              notes: notes || undefined,
            });
            setContact("");
            setNotes("");
          }}
        >
          <div className={dfControl}>
            <label className={dfLabel} htmlFor="dsar-contact">
              Subject contact (e.g. email or internal reference)
            </label>
            <input
              id="dsar-contact"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
              maxLength={512}
              autoComplete="off"
            />
          </div>
          <div className={dfControl}>
            <label className={dfLabel} htmlFor="dsar-type">
              Request type
            </label>
            <input
              id="dsar-type"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base"
              value={reqType}
              onChange={(e) => setReqType(e.target.value)}
              required
              maxLength={128}
            />
          </div>
          <div className={dfControl}>
            <label className={dfLabel} htmlFor="dsar-notes">
              Notes (optional)
            </label>
            <textarea
              id="dsar-notes"
              className="mt-1 min-h-24 w-full rounded-md border border-zinc-300 px-3 py-2 text-base"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={20_000}
            />
          </div>
          <button type="submit" className={dfPrimarySubmit} disabled={createMut.isPending}>
            {createMut.isPending ? "Saving…" : "Record intake"}
          </button>
          {createMut.error ? (
            <p className="text-sm text-red-700" role="alert">
              {createMut.error.message}
            </p>
          ) : null}
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className={dfSectionHeading}>Open tickets</h2>
        {listQuery.isLoading ? (
          <p className={dfMuted}>Loading…</p>
        ) : (listQuery.data?.length ?? 0) === 0 ? (
          <p className={dfMuted}>No requests yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {listQuery.data!.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <div className="font-medium">{r.subjectContact}</div>
                <div className="text-zinc-600">
                  {r.requestType} · {r.status} · {r.createdAt.toISOString().slice(0, 10)}
                </div>
                {r.notes ? <div className="mt-1 text-zinc-700">{r.notes}</div> : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.status !== "in_review" ? (
                    <button
                      type="button"
                      className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                      disabled={statusMut.isPending}
                      onClick={() =>
                        statusMut.mutate({
                          organizationId: org,
                          id: r.id,
                          status: "in_review",
                        })
                      }
                    >
                      Mark in review
                    </button>
                  ) : null}
                  {r.status !== "closed" ? (
                    <button
                      type="button"
                      className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                      disabled={statusMut.isPending}
                      onClick={() =>
                        statusMut.mutate({
                          organizationId: org,
                          id: r.id,
                          status: "closed",
                        })
                      }
                    >
                      Mark closed
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        {listQuery.error ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {listQuery.error.message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
