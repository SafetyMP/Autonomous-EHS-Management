import { and, inArray, isNotNull, lte } from "drizzle-orm";
import type { Db } from "@/server/db";
import { externalPartyCredential } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";

export type ExpiredCredentialOrgBatch = {
  organizationId: string;
  count: number;
  credentialIdsSample: string[];
};

/**
 * Marks credentials past `valid_to` as expired. Single batched `audit_log` row per run
 * (payload summarizes count + sample ids) to avoid one row per credential.
 */
export async function markExpiredCredentials(db: Db): Promise<{
  updated: number;
  affectedByOrg: ExpiredCredentialOrgBatch[];
}> {
  const now = new Date();

  const stale = await db
    .select({
      id: externalPartyCredential.id,
      organizationId: externalPartyCredential.organizationId,
    })
    .from(externalPartyCredential)
    .where(
      and(
        isNotNull(externalPartyCredential.validTo),
        lte(externalPartyCredential.validTo, now),
        inArray(externalPartyCredential.status, ["active", "pending_review"]),
      ),
    )
    .limit(2000);

  if (stale.length === 0) {
    return { updated: 0, affectedByOrg: [] };
  }

  const orgIds = [...new Set(stale.map((r) => r.organizationId))];
  const ids = stale.map((r) => r.id);

  await db
    .update(externalPartyCredential)
    .set({ updatedAt: now, status: "expired" })
    .where(inArray(externalPartyCredential.id, ids));

  const affectedByOrg: ExpiredCredentialOrgBatch[] = [];

  for (const organizationId of orgIds) {
    const orgStale = stale.filter((r) => r.organizationId === organizationId);
    const orgCount = orgStale.length;
    const sample = orgStale.slice(0, 5).map((r) => r.id);
    affectedByOrg.push({ organizationId, count: orgCount, credentialIdsSample: sample });
    await writeAuditLog(db, {
      organizationId,
      actorUserId: null,
      action: "external_party_credential.batch_expire",
      entityType: "external_party_credential",
      entityId: sample[0] ?? organizationId,
      payload: { count: orgCount, credentialIdsSample: sample },
    });
  }

  return { updated: stale.length, affectedByOrg };
}
