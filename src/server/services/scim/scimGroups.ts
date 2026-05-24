import { and, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { authUser, membership, scimGroupMapping, scimGroupMember } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import type { ScimAuthContext } from "./scimAuth";
import {
  applyRoleSlugToMembership,
  resolveRoleSlugFromGroupIds,
} from "./scimGroupRole";

type DbLike = Pick<Db, "select" | "insert" | "delete" | "update">;

export async function listScimGroups(db: DbLike, ctx: ScimAuthContext) {
  const mappings = await db
    .select()
    .from(scimGroupMapping)
    .where(eq(scimGroupMapping.organizationId, ctx.organizationId));

  const result = [];
  for (const mapping of mappings) {
    const members = await db
      .select({ userId: scimGroupMember.userId })
      .from(scimGroupMember)
      .where(
        and(
          eq(scimGroupMember.organizationId, ctx.organizationId),
          eq(scimGroupMember.idpGroupId, mapping.idpGroupId),
        ),
      );
    result.push({ mapping, memberUserIds: members.map((m) => m.userId) });
  }
  return result;
}

export async function getScimGroupByIdpGroupId(
  db: DbLike,
  ctx: ScimAuthContext,
  idpGroupId: string,
) {
  const [mapping] = await db
    .select()
    .from(scimGroupMapping)
    .where(
      and(
        eq(scimGroupMapping.organizationId, ctx.organizationId),
        eq(scimGroupMapping.idpGroupId, idpGroupId),
      ),
    )
    .limit(1);
  if (!mapping) return null;

  const members = await db
    .select({ userId: scimGroupMember.userId })
    .from(scimGroupMember)
    .where(
      and(
        eq(scimGroupMember.organizationId, ctx.organizationId),
        eq(scimGroupMember.idpGroupId, idpGroupId),
      ),
    );
  return { mapping, memberUserIds: members.map((m) => m.userId) };
}

async function syncUserRoleFromGroups(
  db: DbLike,
  ctx: ScimAuthContext,
  userId: string,
): Promise<void> {
  const memberships = await db
    .select({ idpGroupId: scimGroupMember.idpGroupId })
    .from(scimGroupMember)
    .where(
      and(eq(scimGroupMember.organizationId, ctx.organizationId), eq(scimGroupMember.userId, userId)),
    );
  const groupIds = memberships.map((m) => m.idpGroupId);
  const roleSlug = await resolveRoleSlugFromGroupIds(
    db,
    ctx.organizationId,
    groupIds,
    ctx.defaultRoleSlug,
  );

  const [mem] = await db
    .select({ id: membership.id })
    .from(membership)
    .where(
      and(eq(membership.organizationId, ctx.organizationId), eq(membership.userId, userId)),
    )
    .limit(1);
  if (!mem) return;

  await applyRoleSlugToMembership(db, ctx.organizationId, mem.id, roleSlug);
}

export async function addScimGroupMembers(
  db: DbLike,
  ctx: ScimAuthContext,
  idpGroupId: string,
  userIds: string[],
): Promise<{ mapping: typeof scimGroupMapping.$inferSelect; memberUserIds: string[] }> {
  const group = await getScimGroupByIdpGroupId(db, ctx, idpGroupId);
  if (!group) {
    throw new Error("Group not found.");
  }

  for (const userId of userIds) {
    const [u] = await db.select({ id: authUser.id }).from(authUser).where(eq(authUser.id, userId)).limit(1);
    if (!u) continue;

    await db
      .insert(scimGroupMember)
      .values({
        organizationId: ctx.organizationId,
        idpGroupId,
        userId,
      })
      .onConflictDoNothing();

    await syncUserRoleFromGroups(db, ctx, userId);
  }

  await writeAuditLog(db, {
    organizationId: ctx.organizationId,
    actorUserId: null,
    action: "scim.group.members_add",
    entityType: "scim_group_mapping",
    entityId: group.mapping.id,
    payload: { idpGroupId, userIds },
  });

  const updated = await getScimGroupByIdpGroupId(db, ctx, idpGroupId);
  return updated!;
}

export async function removeScimGroupMembers(
  db: DbLike,
  ctx: ScimAuthContext,
  idpGroupId: string,
  userIds: string[],
): Promise<{ mapping: typeof scimGroupMapping.$inferSelect; memberUserIds: string[] }> {
  const group = await getScimGroupByIdpGroupId(db, ctx, idpGroupId);
  if (!group) {
    throw new Error("Group not found.");
  }

  for (const userId of userIds) {
    await db
      .delete(scimGroupMember)
      .where(
        and(
          eq(scimGroupMember.organizationId, ctx.organizationId),
          eq(scimGroupMember.idpGroupId, idpGroupId),
          eq(scimGroupMember.userId, userId),
        ),
      );
    await syncUserRoleFromGroups(db, ctx, userId);
  }

  await writeAuditLog(db, {
    organizationId: ctx.organizationId,
    actorUserId: null,
    action: "scim.group.members_remove",
    entityType: "scim_group_mapping",
    entityId: group.mapping.id,
    payload: { idpGroupId, userIds },
  });

  const updated = await getScimGroupByIdpGroupId(db, ctx, idpGroupId);
  return updated!;
}

/** Parse SCIM PATCH Operations for Group members add/remove. */
export function parseScimGroupPatchBody(body: unknown): {
  addUserIds: string[];
  removeUserIds: string[];
} {
  const addUserIds: string[] = [];
  const removeUserIds: string[] = [];
  if (!body || typeof body !== "object") return { addUserIds, removeUserIds };

  const ops = (body as { Operations?: unknown }).Operations;
  if (!Array.isArray(ops)) return { addUserIds, removeUserIds };

  for (const op of ops) {
    if (!op || typeof op !== "object") continue;
    const path = String((op as { path?: string }).path ?? "").toLowerCase();
    const opType = String((op as { op?: string }).op ?? "add").toLowerCase();
    const value = (op as { value?: unknown }).value;

    if (path !== "members" && path !== "") continue;

    const members = Array.isArray(value) ? value : value ? [value] : [];
    for (const member of members) {
      if (!member || typeof member !== "object") continue;
      const userId = String((member as { value?: string }).value ?? "").trim();
      if (!userId) continue;
      if (opType === "remove") removeUserIds.push(userId);
      else addUserIds.push(userId);
    }
  }

  return { addUserIds, removeUserIds };
}
