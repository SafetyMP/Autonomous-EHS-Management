/**
 * Shared org + RBAC bootstrap for CLI seeds (demo and manual admin link).
 *
 * Callers must pass a Drizzle `db` instance (import after dotenv is loaded).
 */
import { and, eq } from "drizzle-orm";
import { PERMISSIONS } from "../../src/lib/rbac";
import type { Db } from "../../src/server/db";
import {
  authUser,
  membership,
  organization,
  permission,
  role,
  rolePermission,
  site,
} from "../../src/server/db/schema";

export type SeedRbacResult = {
  orgId: string;
  siteId: string;
  userId: string;
  adminRoleId: string;
};

const DEMO_ORG_NAME = "Demo Organization";
const DEMO_SITE_NAME = "Main site";
const ADMIN_SLUG = "admin";

export async function ensureRbacForUser(
  db: Db,
  userEmail: string,
  options?: { orgName?: string; siteName?: string },
): Promise<SeedRbacResult> {
  const orgName = options?.orgName ?? DEMO_ORG_NAME;
  const siteName = options?.siteName ?? DEMO_SITE_NAME;

  const email = userEmail.toLowerCase();
  const [user] = await db
    .select()
    .from(authUser)
    .where(eq(authUser.email, email))
    .limit(1);

  if (!user) {
    throw new Error(`No Better Auth user for ${userEmail}. Create the user first (sign-up or demo seed).`);
  }

  await db
    .insert(permission)
    .values(
      Object.values(PERMISSIONS).map((key) => ({
        key,
        description: key,
      })),
    )
    .onConflictDoNothing({ target: permission.key });

  const allPerms = await db.select().from(permission);
  const permIds = new Map(allPerms.map((p) => [p.key, p.id] as const));

  let [org] = await db
    .select()
    .from(organization)
    .where(eq(organization.name, orgName))
    .limit(1);

  if (!org) {
    [org] = await db.insert(organization).values({ name: orgName, contextSyncEnabled: true }).returning();
  }

  let [mainSite] = await db
    .select()
    .from(site)
    .where(and(eq(site.organizationId, org.id), eq(site.name, siteName)))
    .limit(1);

  if (!mainSite) {
    [mainSite] = await db
      .insert(site)
      .values({ organizationId: org.id, name: siteName })
      .returning();
  }

  let [adminRole] = await db
    .select()
    .from(role)
    .where(and(eq(role.organizationId, org.id), eq(role.slug, ADMIN_SLUG)))
    .limit(1);

  if (!adminRole) {
    [adminRole] = await db
      .insert(role)
      .values({
        organizationId: org.id,
        name: "Administrator",
        slug: ADMIN_SLUG,
      })
      .returning();
  }

  const rpValues = Object.values(PERMISSIONS)
    .map((key) => {
      const pid = permIds.get(key);
      if (!pid) return null;
      return { roleId: adminRole.id, permissionId: pid };
    })
    .filter((v): v is { roleId: string; permissionId: string } => v !== null);

  if (rpValues.length) {
    await db.insert(rolePermission).values(rpValues).onConflictDoNothing();
  }

  const [existingMember] = await db
    .select()
    .from(membership)
    .where(
      and(eq(membership.userId, user.id), eq(membership.organizationId, org.id)),
    )
    .limit(1);

  if (!existingMember) {
    await db.insert(membership).values({
      userId: user.id,
      organizationId: org.id,
      siteId: mainSite.id,
      roleId: adminRole.id,
    });
  }

  return {
    orgId: org.id,
    siteId: mainSite.id,
    userId: user.id,
    adminRoleId: adminRole.id,
  };
}

const CONTRIBUTOR_SLUG = "desk-contributor";

/** CAPA_READ + INSPECTION_READ → desk layout with desk_contributor persona (not supervisor). */
const DESK_CONTRIBUTOR_PERMISSION_KEYS = [
  PERMISSIONS.CAPA_READ,
  PERMISSIONS.INSPECTION_READ,
  PERMISSIONS.INCIDENT_READ,
  PERMISSIONS.TASKS_READ,
] as const;

/**
 * Link an existing Better Auth user as desk_contributor on Demo Organization.
 * Used by CI seed so density/visual gates can assert both desk personas.
 */
export async function ensureDeskContributorForUser(
  db: Db,
  userEmail: string,
  options?: { orgName?: string; siteName?: string },
): Promise<{ orgId: string; userId: string; roleId: string }> {
  const orgName = options?.orgName ?? DEMO_ORG_NAME;
  const siteName = options?.siteName ?? DEMO_SITE_NAME;
  const email = userEmail.toLowerCase();

  const [user] = await db
    .select()
    .from(authUser)
    .where(eq(authUser.email, email))
    .limit(1);

  if (!user) {
    throw new Error(`No Better Auth user for ${userEmail}. Create the user first.`);
  }

  await db
    .insert(permission)
    .values(
      Object.values(PERMISSIONS).map((key) => ({
        key,
        description: key,
      })),
    )
    .onConflictDoNothing({ target: permission.key });

  const allPerms = await db.select().from(permission);
  const permIds = new Map(allPerms.map((p) => [p.key, p.id] as const));

  let [org] = await db
    .select()
    .from(organization)
    .where(eq(organization.name, orgName))
    .limit(1);

  if (!org) {
    [org] = await db.insert(organization).values({ name: orgName, contextSyncEnabled: true }).returning();
  }

  let [mainSite] = await db
    .select()
    .from(site)
    .where(and(eq(site.organizationId, org.id), eq(site.name, siteName)))
    .limit(1);

  if (!mainSite) {
    [mainSite] = await db
      .insert(site)
      .values({ organizationId: org.id, name: siteName })
      .returning();
  }

  let [contributorRole] = await db
    .select()
    .from(role)
    .where(and(eq(role.organizationId, org.id), eq(role.slug, CONTRIBUTOR_SLUG)))
    .limit(1);

  if (!contributorRole) {
    [contributorRole] = await db
      .insert(role)
      .values({
        organizationId: org.id,
        name: "Desk contributor",
        slug: CONTRIBUTOR_SLUG,
      })
      .returning();
  }

  const rpValues = DESK_CONTRIBUTOR_PERMISSION_KEYS.map((key) => {
    const pid = permIds.get(key);
    if (!pid) return null;
    return { roleId: contributorRole.id, permissionId: pid };
  }).filter((v): v is { roleId: string; permissionId: string } => v !== null);

  if (rpValues.length) {
    await db.insert(rolePermission).values(rpValues).onConflictDoNothing();
  }

  const [existingMember] = await db
    .select()
    .from(membership)
    .where(
      and(eq(membership.userId, user.id), eq(membership.organizationId, org.id)),
    )
    .limit(1);

  if (!existingMember) {
    await db.insert(membership).values({
      userId: user.id,
      organizationId: org.id,
      siteId: mainSite.id,
      roleId: contributorRole.id,
    });
  } else if (existingMember.roleId !== contributorRole.id) {
    await db
      .update(membership)
      .set({ roleId: contributorRole.id, siteId: mainSite.id })
      .where(
        and(eq(membership.userId, user.id), eq(membership.organizationId, org.id)),
      );
  }

  return { orgId: org.id, userId: user.id, roleId: contributorRole.id };
}
