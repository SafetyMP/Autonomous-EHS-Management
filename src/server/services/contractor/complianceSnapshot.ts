import { count, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { externalParty, externalPartyCredential } from "@/server/db/schema";

export type ContractorComplianceCounts = {
  externalPartyCount: number;
  credentialsExpired: number;
  credentialsDueSoon30d: number;
  credentialsActive: number;
  /** Expired + due within 30 days — command-center attention signal. */
  renewalAttentionCount: number;
};

const MS_DAY = 24 * 60 * 60 * 1000;

/** Shared contractor compliance counts for PortCo wedge (renewal queue + command center). */
export async function fetchContractorComplianceCounts(
  db: Db,
  organizationId: string,
  now = new Date(),
): Promise<ContractorComplianceCounts> {
  const horizon = new Date(now.getTime() + 30 * MS_DAY);

  const creds = await db
    .select({ validTo: externalPartyCredential.validTo, status: externalPartyCredential.status })
    .from(externalPartyCredential)
    .where(eq(externalPartyCredential.organizationId, organizationId));

  let expired = 0;
  let dueSoon = 0;
  let active = 0;
  for (const c of creds) {
    if (c.status === "rejected") continue;
    if (c.validTo && c.validTo < now) expired += 1;
    else if (c.validTo && c.validTo <= horizon) dueSoon += 1;
    else active += 1;
  }

  const [partyCount] = await db
    .select({ n: count() })
    .from(externalParty)
    .where(eq(externalParty.organizationId, organizationId));

  return {
    externalPartyCount: Number(partyCount?.n ?? 0),
    credentialsExpired: expired,
    credentialsDueSoon30d: dueSoon,
    credentialsActive: active,
    renewalAttentionCount: expired + dueSoon,
  };
}
