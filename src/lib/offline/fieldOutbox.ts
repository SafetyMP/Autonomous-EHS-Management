import { env } from "@/lib/env";
import { classifyOutboxError, type OutboxErrorKind } from "@/lib/offline/outboxErrorKind";

/** IndexedDB database name — exported for e2e seed / support digests. */
export const FIELD_OUTBOX_DB_NAME = "ehs_field_outbox_v1";
const DB_NAME = FIELD_OUTBOX_DB_NAME;
const STORE = "queue";

export type FieldOutboxProcedure =
  | "observation.create"
  | "incident.create"
  | "inspection.create"
  | "inspection.updateStatus"
  | "permit.create"
  | "permit.submitForApproval"
  | "environmentalRegulatoryPermit.create"
  | "environmentalRegulatoryPermit.submitForApproval"
  | "planning.risk.create";

export type FieldOutboxRecord = {
  localId: string;
  procedure: FieldOutboxProcedure;
  organizationId: string;
  payloadJson: string;
  status: "pending" | "failed";
  createdAt: number;
  lastError?: string;
  errorKind?: OutboxErrorKind;
};

/** Feature flag — must match `NEXT_PUBLIC_FIELD_OUTBOX=1`. */
export function isFieldOutboxEnabled(): boolean {
  return env.NEXT_PUBLIC_FIELD_OUTBOX === "1";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB failed to open."));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "localId" });
      }
    };
  });
}

/** Queue with optional stable client key (defaults to localId / random UUID). */
export async function enqueueFieldOutbox(
  partial: Omit<FieldOutboxRecord, "createdAt" | "status" | "localId"> & {
    localId?: string;
  },
): Promise<string> {
  const localId = partial.localId ?? crypto.randomUUID();
  const db = await openDb();
  const row: FieldOutboxRecord = {
    localId,
    procedure: partial.procedure,
    organizationId: partial.organizationId,
    payloadJson: partial.payloadJson,
    status: "pending",
    createdAt: Date.now(),
  };
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error ?? new Error("IndexedDB transaction error"));
    tx.objectStore(STORE).put(row);
  });
  db.close();
  return localId;
}

export async function listPendingFieldOutbox(organizationId: string): Promise<FieldOutboxRecord[]> {
  const db = await openDb();
  const out = await new Promise<FieldOutboxRecord[]>((resolve, reject) => {
    const pending: FieldOutboxRecord[] = [];
    try {
      const rq = db.transaction(STORE, "readonly").objectStore(STORE).openCursor();
      rq.onerror = () => reject(rq.error ?? new Error("cursor error"));
      rq.onsuccess = () => {
        const cursor = rq.result;
        if (!cursor) resolve(pending.sort((a, b) => a.createdAt - b.createdAt));
        else {
          const v = cursor.value as FieldOutboxRecord;
          if (v.organizationId === organizationId && v.status === "pending") pending.push(v);
          cursor.continue();
        }
      };
    } catch (e) {
      reject(e);
    }
  });
  db.close();
  return out;
}

export async function listFailedFieldOutbox(organizationId: string): Promise<FieldOutboxRecord[]> {
  const db = await openDb();
  const out = await new Promise<FieldOutboxRecord[]>((resolve, reject) => {
    const failed: FieldOutboxRecord[] = [];
    try {
      const rq = db.transaction(STORE, "readonly").objectStore(STORE).openCursor();
      rq.onerror = () => reject(rq.error ?? new Error("cursor error"));
      rq.onsuccess = () => {
        const cursor = rq.result;
        if (!cursor) resolve(failed.sort((a, b) => a.createdAt - b.createdAt));
        else {
          const v = cursor.value as FieldOutboxRecord;
          if (v.organizationId === organizationId && v.status === "failed") failed.push(v);
          cursor.continue();
        }
      };
    } catch (e) {
      reject(e);
    }
  });
  db.close();
  return out;
}

export async function resetFailedFieldOutboxToPending(localId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error ?? new Error("IndexedDB tx error"));
    const st = tx.objectStore(STORE);
    const rq = st.get(localId);
    rq.onerror = () => rej(rq.error);
    rq.onsuccess = () => {
      const v = rq.result as FieldOutboxRecord | undefined;
      if (v?.status === "failed") {
        const next: FieldOutboxRecord = {
          localId: v.localId,
          procedure: v.procedure,
          organizationId: v.organizationId,
          payloadJson: v.payloadJson,
          status: "pending",
          createdAt: v.createdAt,
        };
        st.put(next);
      }
    };
  });
  db.close();
}

/** Re-queue all failed rows for the org; returns how many were reset. */
export async function resetAllFailedFieldOutboxForOrg(organizationId: string): Promise<number> {
  const failed = await listFailedFieldOutbox(organizationId);
  for (const row of failed) {
    await resetFailedFieldOutboxToPending(row.localId);
  }
  return failed.length;
}

export async function removeFieldOutbox(localId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error ?? new Error("IndexedDB tx error"));
    tx.objectStore(STORE).delete(localId);
  });
  db.close();
}

export async function markFieldOutboxFailed(localId: string, err: string): Promise<void> {
  const errorKind: OutboxErrorKind = classifyOutboxError(err);
  const db = await openDb();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error ?? new Error("IndexedDB tx error"));
    const st = tx.objectStore(STORE);
    const rq = st.get(localId);
    rq.onerror = () => rej(rq.error);
    rq.onsuccess = () => {
      const v = rq.result as FieldOutboxRecord | undefined;
      if (v) {
        st.put({ ...v, status: "failed", lastError: err.slice(0, 500), errorKind });
      }
    };
  });
  db.close();
}

/** @returns `handled` if the row was sent or intentionally consumed; `skipped` if another procedure owns it */
export async function flushFieldOutbox(
  organizationId: string,
  executor: (row: FieldOutboxRecord) => Promise<"handled" | "skipped">,
): Promise<{ sent: number; failed: number }> {
  const rows = await listPendingFieldOutbox(organizationId);
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const outcome = await executor(row);
      if (outcome === "handled") {
        await removeFieldOutbox(row.localId);
        sent += 1;
      }
    } catch (e) {
      await markFieldOutboxFailed(
        row.localId,
        e instanceof Error ? e.message : String(e),
      );
      failed += 1;
    }
  }
  return { sent, failed };
}
