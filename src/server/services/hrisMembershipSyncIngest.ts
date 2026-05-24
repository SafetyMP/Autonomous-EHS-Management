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
    externalWorkerId: input.externalWorkerId ?? null,
    department: input.department ?? null,
    jobTitle: input.jobTitle ?? null,
    managerEmail: input.managerEmail ? normalizeIntegrationEmail(input.managerEmail) : null,
    costCenter: input.costCenter ?? null,
    employmentStatus: input.employmentStatus ?? null,
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

  let siteIdToSet: string | null | undefined = undefined;
  if (input.siteId !== undefined && input.siteId !== null) {
    const [st] = await db
      .select({ id: site.id })
      .from(site)
      .where(and(eq(site.id, input.siteId), eq(site.organizationId, input.organizationId)))
      .limit(1);
    if (!st) {
      throw new Error("siteId is not in this organization.");
    }
    siteIdToSet = st.id;
  } else if (input.siteId === null) {
    siteIdToSet = null;
  }

  let managerUserId: string | null | undefined = undefined;
  if (input.managerEmail) {
    const managerEmail = normalizeIntegrationEmail(input.managerEmail);
    const [manager] = await db
      .select({ id: authUser.id })
      .from(authUser)
      .where(eq(authUser.email, managerEmail))
      .limit(1);
    managerUserId = manager?.id ?? null;
  }

  const patch: Partial<typeof membership.$inferInsert> = {};

  if (siteIdToSet !== undefined) patch.siteId = siteIdToSet;
  if (input.externalWorkerId !== undefined && input.externalWorkerId !== null) {
    patch.externalWorkerId = input.externalWorkerId;
  }
  if (input.department !== undefined && input.department !== null) patch.department = input.department;
  if (input.jobTitle !== undefined && input.jobTitle !== null) patch.jobTitle = input.jobTitle;
  if (managerUserId !== undefined) patch.managerUserId = managerUserId;
  if (input.costCenter !== undefined && input.costCenter !== null) patch.costCenter = input.costCenter;
  if (input.employmentStatus !== undefined && input.employmentStatus !== null) {
    patch.employmentStatus = input.employmentStatus;
    if (input.employmentStatus === "terminated") {
      patch.lifecycleStatus = "suspended";
    } else if (input.employmentStatus === "active") {
      patch.lifecycleStatus = "active";
    }
  }

  if (Object.keys(patch).length > 0) {
    await db.update(membership).set(patch).where(eq(membership.id, mem.id));
  }

  await writeAuditLog(db, {
    organizationId: input.organizationId,
    actorUserId,
    action: "integration.hris_membership_sync",
    entityType: "membership",
    entityId: mem.id,
    payload: {
      integrationEventId: eventId,
      siteIdSet: siteIdToSet ?? undefined,
      fieldsUpdated: Object.keys(patch),
    },
  });

  return { membershipId: mem.id };
}
