import { and, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import {
  authUser,
  membership,
  role,
} from "@/server/db/schema";
import { normalizeIntegrationEmail } from "@/lib/integration/inboundEnvelope";
import { writeAuditLog } from "@/server/services/audit";
import type { ScimAuthContext } from "./scimAuth";

function newAuthUserId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

async function resolveRoleId(
  db: Db,
  organizationId: string,
  roleSlug: string,
): Promise<string> {
  const [roleRow] = await db
    .select({ id: role.id })
    .from(role)
    .where(and(eq(role.organizationId, organizationId), eq(role.slug, roleSlug)))
    .limit(1);
  if (!roleRow) {
    throw new Error(`Role slug "${roleSlug}" not found in organization.`);
  }
  return roleRow.id;
}

export async function listScimUsers(
  db: Db,
  ctx: ScimAuthContext,
  filterEmail?: string,
): Promise<{ user: typeof authUser.$inferSelect; membership: typeof membership.$inferSelect }[]> {
  const rows = await db
    .select({ user: authUser, membership })
    .from(membership)
    .innerJoin(authUser, eq(membership.userId, authUser.id))
    .where(eq(membership.organizationId, ctx.organizationId));

  if (filterEmail) {
    const normalized = normalizeIntegrationEmail(filterEmail);
    return rows.filter((r) => r.user.email === normalized);
  }
  return rows;
}

export async function getScimUserById(
  db: Db,
  ctx: ScimAuthContext,
  userId: string,
): Promise<{ user: typeof authUser.$inferSelect; membership: typeof membership.$inferSelect } | null> {
  const [row] = await db
    .select({ user: authUser, membership })
    .from(membership)
    .innerJoin(authUser, eq(membership.userId, authUser.id))
    .where(and(eq(membership.organizationId, ctx.organizationId), eq(authUser.id, userId)))
    .limit(1);
  return row ?? null;
}

export type ScimCreateUserInput = {
  userName: string;
  name?: { formatted?: string };
  externalId?: string;
  active?: boolean;
};

export async function createScimUser(
  db: Db,
  ctx: ScimAuthContext,
  input: ScimCreateUserInput,
): Promise<{ user: typeof authUser.$inferSelect; membership: typeof membership.$inferSelect }> {
  const email = normalizeIntegrationEmail(input.userName);
  const displayName = input.name?.formatted?.trim() || email.split("@")[0] || "SCIM User";
  const roleId = await resolveRoleId(db, ctx.organizationId, ctx.defaultRoleSlug);
  const active = input.active !== false;

  const [existingUser] = await db
    .select()
    .from(authUser)
    .where(eq(authUser.email, email))
    .limit(1);

  let user = existingUser;
  if (!user) {
    const userId = newAuthUserId();
    const [inserted] = await db
      .insert(authUser)
      .values({
        id: userId,
        name: displayName,
        email,
        emailVerified: true,
      })
      .returning();
    user = inserted!;
  }

  const [existingMem] = await db
    .select()
    .from(membership)
    .where(
      and(eq(membership.userId, user.id), eq(membership.organizationId, ctx.organizationId)),
    )
    .limit(1);

  if (existingMem) {
    throw new Error("User already provisioned in this organization.");
  }

  const [mem] = await db
    .insert(membership)
    .values({
      userId: user.id,
      organizationId: ctx.organizationId,
      roleId,
      siteId: null,
      externalWorkerId: input.externalId ?? null,
      lifecycleStatus: active ? "active" : "suspended",
      employmentStatus: active ? "active" : "terminated",
    })
    .returning();

  await writeAuditLog(db, {
    organizationId: ctx.organizationId,
    actorUserId: null,
    action: "scim.user.create",
    entityType: "membership",
    entityId: mem!.id,
    payload: { userId: user.id, email, externalId: input.externalId ?? null },
  });

  return { user, membership: mem! };
}

export async function patchScimUser(
  db: Db,
  ctx: ScimAuthContext,
  userId: string,
  patch: { active?: boolean; externalId?: string; displayName?: string },
): Promise<{ user: typeof authUser.$inferSelect; membership: typeof membership.$inferSelect }> {
  const row = await getScimUserById(db, ctx, userId);
  if (!row) {
    throw new Error("User not found.");
  }

  if (patch.displayName) {
    await db.update(authUser).set({ name: patch.displayName }).where(eq(authUser.id, userId));
  }

  const memPatch: Partial<typeof membership.$inferInsert> = {};
  if (patch.externalId !== undefined) {
    memPatch.externalWorkerId = patch.externalId;
  }
  if (patch.active !== undefined) {
    memPatch.lifecycleStatus = patch.active ? "active" : "suspended";
    memPatch.employmentStatus = patch.active ? "active" : "terminated";
  }

  if (Object.keys(memPatch).length > 0) {
    await db.update(membership).set(memPatch).where(eq(membership.id, row.membership.id));
  }

  await writeAuditLog(db, {
    organizationId: ctx.organizationId,
    actorUserId: null,
    action: "scim.user.patch",
    entityType: "membership",
    entityId: row.membership.id,
    payload: { userId, fields: Object.keys(patch) },
  });

  const updated = await getScimUserById(db, ctx, userId);
  return updated!;
}

export async function deactivateScimUser(
  db: Db,
  ctx: ScimAuthContext,
  userId: string,
): Promise<void> {
  const row = await getScimUserById(db, ctx, userId);
  if (!row) {
    throw new Error("User not found.");
  }

  await db
    .update(membership)
    .set({ lifecycleStatus: "suspended", employmentStatus: "terminated" })
    .where(eq(membership.id, row.membership.id));

  await writeAuditLog(db, {
    organizationId: ctx.organizationId,
    actorUserId: null,
    action: "scim.user.deactivate",
    entityType: "membership",
    entityId: row.membership.id,
    payload: { userId },
  });
}

/** Parse SCIM filter `userName eq "email@example.com"`. */
export function parseScimUserNameFilter(filter: string | null): string | undefined {
  if (!filter) return undefined;
  const m = /^userName\s+eq\s+"([^"]+)"$/i.exec(filter.trim());
  return m?.[1];
}

/** Parse SCIM PATCH Operations array for active / externalId / name. */
export function parseScimPatchBody(body: unknown): {
  active?: boolean;
  externalId?: string;
  displayName?: string;
} {
  const out: { active?: boolean; externalId?: string; displayName?: string } = {};
  if (!body || typeof body !== "object") return out;

  const ops = (body as { Operations?: unknown }).Operations;
  if (!Array.isArray(ops)) return out;

  for (const op of ops) {
    if (!op || typeof op !== "object") continue;
    const path = String((op as { path?: string }).path ?? "").toLowerCase();
    const value = (op as { value?: unknown }).value;

    if (path === "active" && typeof value === "boolean") {
      out.active = value;
    } else if (path === "externalid" && typeof value === "string") {
      out.externalId = value;
    } else if (path === 'name.formatted' && typeof value === "string") {
      out.displayName = value;
    } else if (!path && value && typeof value === "object") {
      const v = value as Record<string, unknown>;
      if (typeof v.active === "boolean") out.active = v.active;
      if (typeof v.externalId === "string") out.externalId = v.externalId;
      const name = v.name as { formatted?: string } | undefined;
      if (name?.formatted) out.displayName = name.formatted;
    }
  }
  return out;
}
