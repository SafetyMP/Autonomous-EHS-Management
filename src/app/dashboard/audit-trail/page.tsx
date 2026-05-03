"use client";

import { useCallback, useMemo, useState } from "react";
import { OrgSwitcher } from "@/components/org-switcher";
import { useOrg } from "@/components/org-context";
import { trpc } from "@/trpc/react";
import {
  dfControl,
  dfLabel,
  dfMuted,
  dfPrimarySubmit,
  dfSectionHeading,
  dfSecondaryOutline,
} from "@/lib/dashboard-field-styles";

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  payload: Record<string, unknown> | null;
};

type FilterForm = {
  entityType: string;
  action: string;
  actorUserId: string;
  createdAfter: string;
  createdBefore: string;
};

const emptyFilters: FilterForm = {
  entityType: "",
  action: "",
  actorUserId: "",
  createdAfter: "",
  createdBefore: "",
};

type Cursor = { createdAt: string; id: string };

export default function AuditTrailPage() {
  const { organizationId } = useOrg();
  const utils = trpc.useUtils();
  const org = organizationId!;

  const [applied, setApplied] = useState<FilterForm>(emptyFilters);
  const [draft, setDraft] = useState<FilterForm>(emptyFilters);
  const [exportBusy, setExportBusy] = useState(false);
  /** Cursor stack: `undefined` = first page; each entry is the keyset cursor for that page. */
  const [cursorStack, setCursorStack] = useState<Array<Cursor | undefined>>([undefined]);

  const pageCursor = cursorStack[cursorStack.length - 1];

  const listInput = useMemo(
    () => ({
      organizationId: org,
      limit: 50,
      ...(pageCursor ? { cursor: pageCursor } : {}),
      entityType: applied.entityType.trim() || undefined,
      action: applied.action.trim() || undefined,
      actorUserId: applied.actorUserId.trim() || undefined,
      createdAfter: applied.createdAfter ? new Date(applied.createdAfter) : undefined,
      createdBefore: applied.createdBefore ? new Date(applied.createdBefore) : undefined,
    }),
    [org, pageCursor, applied],
  );

  const listQuery = trpc.compliance.auditTrail.list.useQuery(listInput, {
    enabled: !!organizationId,
  });

  const rows = (listQuery.data?.items ?? []) as AuditRow[];
  const nextCursor = listQuery.data?.nextCursor ?? null;

  const applyFilters = useCallback(() => {
    setApplied({ ...draft });
    setCursorStack([undefined]);
  }, [draft]);

  const clearFilters = useCallback(() => {
    setDraft(emptyFilters);
    setApplied(emptyFilters);
    setCursorStack([undefined]);
  }, []);

  const goNextPage = useCallback(() => {
    if (!nextCursor) return;
    setCursorStack((s) => [...s, nextCursor]);
  }, [nextCursor]);

  const goPrevPage = useCallback(() => {
    setCursorStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  const downloadExportCsv = useCallback(async () => {
    if (!organizationId) return;
    setExportBusy(true);
    try {
      const result = await utils.client.compliance.auditTrail.exportCsv.query({
        organizationId,
        limit: 2000,
        entityType: applied.entityType.trim() || undefined,
        action: applied.action.trim() || undefined,
        actorUserId: applied.actorUserId.trim() || undefined,
        createdAfter: applied.createdAfter ? new Date(applied.createdAfter) : undefined,
        createdBefore: applied.createdBefore ? new Date(applied.createdBefore) : undefined,
      });
      const blob = new Blob([result.csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-trail-${organizationId}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportBusy(false);
    }
  }, [organizationId, applied, utils.client]);

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Audit trail</h1>
        <OrgSwitcher />
      </div>
    );
  }

  const queryError =
    listQuery.error instanceof Error ? listQuery.error.message : listQuery.error ? String(listQuery.error) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">System audit trail</h1>
          <p className={dfMuted}>
            Read-only record of transactional events (who changed what and when). This is not the same as{" "}
            <span className="font-medium text-zinc-700">Audits</span> (ISO internal audit programme). Payloads may
            contain operational detail—handle per your policy.
          </p>
        </div>
        <OrgSwitcher />
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className={dfSectionHeading}>Filters</h2>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters();
          }}
        >
          <div className={dfControl}>
            <label className={dfLabel} htmlFor="at-entity">
              Entity type
            </label>
            <input
              id="at-entity"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base"
              value={draft.entityType}
              onChange={(e) => setDraft((d) => ({ ...d, entityType: e.target.value }))}
              maxLength={128}
              placeholder="e.g. incident"
            />
          </div>
          <div className={dfControl}>
            <label className={dfLabel} htmlFor="at-action">
              Action
            </label>
            <input
              id="at-action"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base"
              value={draft.action}
              onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
              maxLength={128}
              placeholder="e.g. incident.update"
            />
          </div>
          <div className={dfControl}>
            <label className={dfLabel} htmlFor="at-actor">
              Actor user id
            </label>
            <input
              id="at-actor"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base"
              value={draft.actorUserId}
              onChange={(e) => setDraft((d) => ({ ...d, actorUserId: e.target.value }))}
              placeholder="Better Auth user id"
            />
          </div>
          <div className={dfControl}>
            <label className={dfLabel} htmlFor="at-after">
              After (local)
            </label>
            <input
              id="at-after"
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base"
              value={draft.createdAfter}
              onChange={(e) => setDraft((d) => ({ ...d, createdAfter: e.target.value }))}
            />
          </div>
          <div className={dfControl}>
            <label className={dfLabel} htmlFor="at-before">
              Before (local)
            </label>
            <input
              id="at-before"
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base"
              value={draft.createdBefore}
              onChange={(e) => setDraft((d) => ({ ...d, createdBefore: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
            <button type="submit" className={dfPrimarySubmit}>
              Apply filters
            </button>
            <button type="button" className={dfSecondaryOutline} onClick={clearFilters}>
              Clear
            </button>
          </div>
        </form>
      </section>

      {queryError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {queryError}
        </p>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={dfSectionHeading}>Events</h2>
          <button
            type="button"
            className={dfSecondaryOutline}
            disabled={exportBusy || listQuery.isFetching}
            onClick={() => void downloadExportCsv()}
          >
            {exportBusy ? "Preparing CSV…" : "Download CSV (up to 2000 rows)"}
          </button>
        </div>
        <p className={`mt-2 text-sm ${dfMuted}`}>
          Export uses the <span className="font-medium">applied</span> filters above (newest first). Large exports may take a moment; each download is recorded in the audit trail.
        </p>
        {listQuery.isLoading ? (
          <p className={dfMuted}>Loading…</p>
        ) : rows.length === 0 ? (
          <p className={dfMuted}>No audit events match the current filters.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-[720px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  <th className="py-2 pr-3">When (UTC)</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Entity</th>
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2">Payload</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const when = new Date(row.createdAt);
                  const whenStr = Number.isNaN(when.getTime())
                    ? row.createdAt
                    : `${when.toISOString().replace("T", " ").slice(0, 19)}Z`;
                  const actor =
                    row.actorName || row.actorEmail
                      ? [row.actorName, row.actorEmail].filter(Boolean).join(" · ")
                      : row.actorUserId
                        ? `User ${row.actorUserId}`
                        : "—";
                  return (
                    <tr key={row.id} className="border-b border-zinc-100 align-top">
                      <td className="py-2 pr-3 font-mono text-xs text-zinc-700">{whenStr}</td>
                      <td className="py-2 pr-3 text-zinc-900">{row.action}</td>
                      <td className="py-2 pr-3">
                        <span className="text-zinc-900">{row.entityType}</span>
                        <span className="block break-all font-mono text-xs text-zinc-600">{row.entityId}</span>
                      </td>
                      <td className="max-w-[200px] break-words py-2 pr-3">{actor}</td>
                      <td className="py-2">
                        {row.payload && Object.keys(row.payload).length > 0 ? (
                          <details className="rounded-md border border-zinc-200 bg-zinc-50 p-2">
                            <summary className="cursor-pointer text-xs font-medium text-zinc-800">
                              View JSON
                            </summary>
                            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all text-xs text-zinc-700">
                              {JSON.stringify(row.payload, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={dfSecondaryOutline}
            disabled={cursorStack.length <= 1 || listQuery.isFetching}
            onClick={goPrevPage}
          >
            Previous page
          </button>
          <button
            type="button"
            className={dfSecondaryOutline}
            disabled={!nextCursor || listQuery.isFetching}
            onClick={goNextPage}
          >
            Next page
          </button>
        </div>
      </section>
    </div>
  );
}
