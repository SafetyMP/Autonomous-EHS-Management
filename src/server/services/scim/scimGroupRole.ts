import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/server/db";
import { membership, role, scimGroupMapping } from "@/server/db/schema";

/** Resolve role slug from IdP group ids; first mapping match wins. */
export async function resolveRoleSlugFromGroupIds(
  db: Pick<Db, "select">,
  organizationId: string,
  groupIds: string[],
  defaultRoleSlug: string,
): Promise<string> {
  const uniqueIds = [...new Set(groupIds.map((g) => g.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return defaultRoleSlug;

  const mappings = await db
    .select({ idpGroupId: scimGroupMapping.idpGroupId, roleSlug: scimGroupMapping.roleSlug })
    .from(scimGroupMapping)
    .where(
      and(
        eq(scimGroupMapping.organizationId, organizationId),
        inArray(scimGroupMapping.idpGroupId, uniqueIds),
      ),
    );

  const byId = new Map(mappings.map((m) => [m.idpGroupId, m.roleSlug]));
  for (const id of uniqueIds) {
    const slug = byId.get(id);
    if (slug) return slug;
  }
  return defaultRoleSlug;
}

export async function resolveRoleIdForSlug(
  db: Pick<Db, "select">,
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

export async function applyRoleSlugToMembership(
  db: Pick<Db, "select" | "update">,
  organizationId: string,
  membershipId: string,
  roleSlug: string,
): Promise<void> {
  const roleId = await resolveRoleIdForSlug(db, organizationId, roleSlug);
  await db
    .update(membership)
    .set({ roleId })
    .where(and(eq(membership.id, membershipId), eq(membership.organizationId, organizationId)));
}
