import { and, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import type { HrisMembershipSyncInput } from "@/lib/integration/inboundEnvelope";
import { normalizeIntegrationEmail } from "@/lib/integration/inboundEnvelope";
import { authUser, membership, site } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";

type DbLike = Pick<Db, "select" | "update" | "insert">;

export function hrisPayloadForIntegrationEvent(input: HrisMembershipSyncInput): Record<string, unknown> {
  return {
    workerEmail: normalizeIntegrationEmail(input.workerEmail),
    siteId: input.siteId ?? null,
  };
}

export async function applyHrisMembershipSync(
  db: DbLike,
  input: HrisMembershipSyncInput,
  eventId: string,
  actorUserId: string | null,
): Promise<{ membershipId: string }> {
  const email = normalizeIntegrationEmail(input.workerEmail);

  const [u] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, email))
    .limit(1);
  if (!u) {
    throw new Error("No user matches workerEmail; user must exist (sign-in identity).");
  }

  const [mem] = await db
    .select({ id: membership.id })
    .from(membership)
    .where(
      and(eq(membership.organizationId, input.organizationId), eq(membership.userId, u.id)),
    )
    .limit(1);
  if (!mem) {
    throw new Error("User is not a member of this organization.");
  }

  let siteIdToSet: string | null = null;
  if (input.siteId) {
    const [st] = await db
      .select({ id: site.id })
      .from(site)
      .where(and(eq(site.id, input.siteId), eq(site.organizationId, input.organizationId)))
      .limit(1);
    if (!st) {
      throw new Error("siteId is not in this organization.");
    }
    siteIdToSet = st.id;
  }

  await db
    .update(membership)
    .set({ siteId: siteIdToSet })
    .where(eq(membership.id, mem.id));

  await writeAuditLog(db, {
    organizationId: input.organizationId,
    actorUserId,
    action: "integration.hris_membership_sync",
    entityType: "membership",
    entityId: mem.id,
    payload: {
      integrationEventId: eventId,
      siteIdSet: siteIdToSet,
    },
  });

  return { membershipId: mem.id };
}
