"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useOrg } from "@/components/org-context";
import {
  isFieldOutboxEnabled,
  listFailedFieldOutbox,
  listPendingFieldOutbox,
  removeFieldOutbox,
  resetAllFailedFieldOutboxForOrg,
  type FieldOutboxRecord,
} from "@/lib/offline/fieldOutbox";
import { outboxErrorKindLabel } from "@/lib/offline/outboxErrorKind";

export type FieldOutboxLastFlush = { sent: number; failed: number };

type FieldOutboxUiContextValue = {
  flushNonce: number;
  bumpFlush: () => void;
  lastFlushResult: FieldOutboxLastFlush | null;
  reportFlushResult: (r: FieldOutboxLastFlush | null) => void;
};

const FieldOutboxUiContext = createContext<FieldOutboxUiContextValue | null>(null);

export function FieldOutboxUiProvider({ children }: { children: ReactNode }) {
  const [flushNonce, setFlushNonce] = useState(0);
  const [lastFlushResult, setLastFlushResult] = useState<FieldOutboxLastFlush | null>(null);

  const bumpFlush = useCallback(() => {
    setFlushNonce((n) => n + 1);
  }, []);

  const reportFlushResult = useCallback((r: FieldOutboxLastFlush | null) => {
    setLastFlushResult(r);
  }, []);

  const value = useMemo(
    () => ({ flushNonce, bumpFlush, lastFlushResult, reportFlushResult }),
    [flushNonce, bumpFlush, lastFlushResult, reportFlushResult],
  );

  return <FieldOutboxUiContext.Provider value={value}>{children}</FieldOutboxUiContext.Provider>;
}

export function useFieldOutboxUi(): FieldOutboxUiContextValue {
  const ctx = useContext(FieldOutboxUiContext);
  if (!ctx) {
    throw new Error("useFieldOutboxUi must be used within FieldOutboxUiProvider");
  }
  return ctx;
}

/**
 * Compact offline outbox messaging: last flush outcome and retry for failed rows.
 * Mount under `FieldOutboxUiProvider` with `NEXT_PUBLIC_FIELD_OUTBOX=1`.
 */
export function FieldOutboxStatusBar() {
  const { organizationId } = useOrg();
  const { flushNonce, bumpFlush, lastFlushResult } = useFieldOutboxUi();
  const [failedRows, setFailedRows] = useState<FieldOutboxRecord[]>([]);
  const [pendingRows, setPendingRows] = useState<FieldOutboxRecord[]>([]);
  const [retryBusy, setRetryBusy] = useState(false);
  const [removeBusyId, setRemoveBusyId] = useState<string | null>(null);
  const [syncAnnounce, setSyncAnnounce] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId || !isFieldOutboxEnabled()) return;
    let cancelled = false;
    void Promise.all([
      listFailedFieldOutbox(organizationId),
      listPendingFieldOutbox(organizationId),
    ]).then(([failed, pending]) => {
      if (!cancelled) {
        setFailedRows(failed);
        setPendingRows(pending);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId, flushNonce, lastFlushResult]);

  useEffect(() => {
    if (!lastFlushResult || (lastFlushResult.sent === 0 && lastFlushResult.failed === 0)) {
      return;
    }
    const msg =
      lastFlushResult.failed > 0
        ? `Offline sync finished: ${lastFlushResult.sent} sent, ${lastFlushResult.failed} failed.`
        : `Offline sync finished: ${lastFlushResult.sent} sent.`;
    const show = window.setTimeout(() => {
      setSyncAnnounce(msg);
    }, 0);
    const hide = window.setTimeout(() => {
      setSyncAnnounce(null);
    }, 12_000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [lastFlushResult]);

  if (!isFieldOutboxEnabled() || !organizationId) return null;
  const orgId = organizationId;

  const flushLine =
    lastFlushResult && (lastFlushResult.sent > 0 || lastFlushResult.failed > 0)
      ? lastFlushResult.failed > 0
        ? `Offline queue: ${lastFlushResult.failed} update(s) failed on last sync.`
        : `Offline queue: sent ${lastFlushResult.sent} update(s).`
      : null;

  const pendingLine =
    pendingRows.length > 0
      ? `${pendingRows.length} offline item(s) queued on this device — they send when you are online.`
      : null;

  const failedLine =
    failedRows.length > 0
      ? `${failedRows.length} offline item(s) could not sync. You can retry after fixing connection or validation issues.`
      : null;

  if (!flushLine && !failedLine && !pendingLine) return null;

  async function onRemoveFailed(localId: string) {
    setRemoveBusyId(localId);
    try {
      await removeFieldOutbox(localId);
      bumpFlush();
    } finally {
      setRemoveBusyId(null);
    }
  }

  async function onRetryFailed() {
    setRetryBusy(true);
    try {
      await resetAllFailedFieldOutboxForOrg(orgId);
      bumpFlush();
    } finally {
      setRetryBusy(false);
    }
  }

  return (
    <div
      role="region"
      aria-label="Offline sync queue"
      className="shrink-0 rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 text-base text-zinc-900"
    >
      {syncAnnounce ? (
        <p role="status" aria-live="polite" className="mb-2 font-medium text-emerald-900">
          {syncAnnounce}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div aria-live="polite" className="min-w-0 space-y-1">
          {pendingLine ? <p className="text-zinc-800">{pendingLine}</p> : null}
          {flushLine ? <p>{flushLine}</p> : null}
          {failedLine ? <p className="text-zinc-800">{failedLine}</p> : null}
        </div>
        {failedRows.length > 0 ? (
          <button
            type="button"
            disabled={retryBusy}
            onClick={() => void onRetryFailed()}
            className="touch-target shrink-0 rounded-md border border-emerald-700 bg-emerald-600 px-4 py-2 text-base font-medium text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {retryBusy ? "Retrying…" : "Retry failed syncs"}
          </button>
        ) : null}
      </div>
      {failedRows.length > 0 ? (
        <details className="mt-3 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
          <summary className="cursor-pointer touch-target py-1 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
            View last error per failed item
          </summary>
          <ul className="mt-2 space-y-3 border-t border-amber-200/80 pt-2 text-amber-950" role="list">
            {failedRows.map((r) => (
              <li key={r.localId} className="break-words">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <span className="font-medium">{r.procedure}</span>
                    {r.errorKind ? (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-950">
                        {outboxErrorKindLabel(r.errorKind)}
                      </span>
                    ) : null}
                    {r.lastError ? (
                      <>
                        {": "}
                        <span className="whitespace-pre-wrap">{r.lastError}</span>
                      </>
                    ) : (
                      " — no error detail stored."
                    )}
                  </div>
                  <button
                    type="button"
                    className="touch-target shrink-0 self-start rounded border border-zinc-400 px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60"
                    disabled={removeBusyId === r.localId}
                    aria-label={`Remove failed offline queue item ${r.procedure}`}
                    onClick={() => void onRemoveFailed(r.localId)}
                  >
                    {removeBusyId === r.localId ? "Removing…" : "Remove from device"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-amber-950">
            If the server record changed while you were offline (for example someone else edited the same inspection,
            or the entity was deleted), retries may keep failing until you discard the queued item from this device and
            submit again from the live form—that avoids silently overwriting fresher server data.
          </p>
        </details>
      ) : null}
    </div>
  );
}
