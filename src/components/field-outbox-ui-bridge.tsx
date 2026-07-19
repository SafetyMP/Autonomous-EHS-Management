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
import {
  outboxErrorKindGuidance,
  outboxErrorKindLabel,
} from "@/lib/offline/outboxErrorKind";

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
 * Additive success-only toast (ADR-UX-003 / UD-PL-UX-002).
 * Failed sync / conflict / device-loss MUST remain in FieldOutboxStatusBar — never toast-only.
 */
export function FieldOutboxSuccessToast() {
  const { lastFlushResult } = useFieldOutboxUi();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isFieldOutboxEnabled()) return;
    if (!lastFlushResult || lastFlushResult.sent <= 0 || lastFlushResult.failed > 0) {
      return;
    }
    const msg =
      lastFlushResult.sent === 1
        ? "Offline queue: 1 update sent from this device."
        : `Offline queue: ${lastFlushResult.sent} updates sent from this device.`;
    const show = window.setTimeout(() => setMessage(msg), 0);
    const hide = window.setTimeout(() => setMessage(null), 8_000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [lastFlushResult]);

  if (!isFieldOutboxEnabled() || !message) return null;

  return (
    <div
      data-field-outbox-success-toast="1"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-[max(1rem,env(safe-area-inset-left))] pb-[max(1rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))]"
      aria-hidden={false}
    >
      <p
        role="status"
        aria-live="polite"
        className="pointer-events-auto max-w-lg rounded-md border border-success bg-success-surface px-4 py-3 text-base font-medium text-success shadow-sm"
      >
        {message}
      </p>
    </div>
  );
}

/**
 * Durable offline outbox status region (ADR-UX-003 status-region-first).
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
      ? `${failedRows.length} offline item(s) could not sync. Retry after fixing connection or validation issues, or remove stale items.`
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

  const hasConflict = failedRows.some((r) => r.errorKind === "conflict");

  return (
    <div
      id="field-outbox-status"
      data-field-outbox-status="1"
      role="region"
      aria-label="Offline sync queue"
      className="field-status-region shrink-0 rounded-lg border border-border-strong bg-surface-muted text-base text-foreground"
    >
      {syncAnnounce ? (
        <p role="status" aria-live="polite" className="mb-2 font-medium text-success">
          {syncAnnounce}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div aria-live="polite" className="min-w-0 space-y-1">
          {pendingLine ? <p className="text-text-muted">{pendingLine}</p> : null}
          {flushLine ? <p>{flushLine}</p> : null}
          {failedLine ? (
            <p className="text-text-muted">
              {failedLine}
              {hasConflict ? (
                <span
                  data-outbox-error-kind="conflict"
                  className="ml-2 inline-block rounded bg-warning-surface px-1.5 py-0.5 text-xs font-semibold text-warning ring-1 ring-warning"
                >
                  {outboxErrorKindLabel("conflict")}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        {failedRows.length > 0 ? (
          <button
            type="button"
            data-outbox-retry="1"
            disabled={retryBusy}
            aria-busy={retryBusy}
            onClick={() => void onRetryFailed()}
            className="btn-primary touch-target shrink-0"
          >
            {retryBusy ? "Retrying…" : "Retry failed syncs"}
          </button>
        ) : null}
      </div>
      {failedRows.length > 0 ? (
        <details className="mt-3 rounded-md border border-warning bg-warning-surface px-3 py-2 text-sm text-foreground">
          <summary className="cursor-pointer touch-target py-1 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2">
            View last error per failed item
          </summary>
          <ul className="mt-2 space-y-3 border-t border-warning/40 pt-2" role="list">
            {failedRows.map((r) => (
              <li key={r.localId} className="break-words" data-outbox-failed-row={r.localId}>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <span className="font-medium">{r.procedure}</span>
                    {r.errorKind ? (
                      <span className="ml-2 rounded bg-warning-surface px-1.5 py-0.5 text-xs font-semibold text-warning ring-1 ring-warning">
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
                    {r.errorKind ? (
                      <p className="mt-1 text-sm leading-relaxed text-text-muted">
                        {outboxErrorKindGuidance(r.errorKind)}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    data-outbox-remove="1"
                    className="btn-secondary touch-target shrink-0 self-start"
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
          {hasConflict ? (
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              Conflict items are not merged automatically across devices. Last successful replay from a
              device wins on the server until a multi-device policy exists — discard the stale queue item
              here instead of forcing overwrite.
            </p>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              If the server record changed while you were offline, retries may keep failing until you
              discard the queued item from this device and submit again from the live form.
            </p>
          )}
        </details>
      ) : null}
      <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm leading-relaxed text-text-muted">
        <p>
          Queued items live in <strong className="font-semibold text-foreground">this browser’s IndexedDB</strong>{" "}
          on this device only. There is no server-side draft for pending queue items. Lost, wiped, or
          replaced devices lose unreplayed rows — re-enter critical field data; do not expect recovery
          on another phone or browser.
        </p>
        <p>
          Field photos are <strong className="font-semibold text-foreground">not</strong> queued offline.
          Remove photos or reconnect before save.
        </p>
      </div>
    </div>
  );
}
