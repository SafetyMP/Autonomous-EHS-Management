import type { Db } from "@/server/db";
import { auditLog } from "@/server/db/schema";

type AuditInput = {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
};

/** Accepts the root DB client or a Drizzle transaction — same `insert` API. */
type DbForAudit = Pick<Db, "insert">;

export async function writeAuditLog(db: DbForAudit, input: AuditInput) {
  await db.insert(auditLog).values({
    organizationId: input.organizationId ?? null,
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    payload: input.payload ?? null,
  });
}
