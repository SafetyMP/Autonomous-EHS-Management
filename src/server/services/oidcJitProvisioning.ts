import { and, eq } from "drizzle-orm";
import { env } from "@/lib/env";
import type { Db } from "@/server/db";
import {
  authAccount,
  authUser,
  membership,
  organization,
  role,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";

const DEFAULT_JIT_ROLE_SLUG = "admin";

function oidcProviderIdForAccountMatch(): string {
  return env.OIDC_PROVIDER_ID ?? "enterprise-oidc";
}

/**
 * After OAuth/OIDC sign-in, link the user to the configured default org if enabled and eligible.
 * Safe to call on every new session; no-ops unless env is set and user uses the OIDC provider account.
 */
export async function provisionOidcJitMembershipIfEnabled(
  db: Db,
  userId: string,
): Promise<{ linked: boolean; reason?: string }> {
  if (env.OIDC_JIT_ENABLED !== "true") {
    return { linked: false, reason: "jit_disabled" };
  }

  const orgId = env.OIDC_JIT_DEFAULT_ORG_ID?.trim();
  if (!orgId) {
    return { linked: false, reason: "missing_org_id" };
  }

  const [orgRow] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  if (!orgRow) {
    return { linked: false, reason: "org_not_found" };
  }

  const providerId = oidcProviderIdForAccountMatch();
  const [oauthAccount] = await db
    .select({ id: authAccount.id })
    .from(authAccount)
    .where(and(eq(authAccount.userId, userId), eq(authAccount.providerId, providerId)))
    .limit(1);

  if (!oauthAccount) {
    return { linked: false, reason: "not_oidc_account" };
  }

  const [existingMember] = await db
    .select({ id: membership.id })
    .from(membership)
    .where(and(eq(membership.userId, userId), eq(membership.organizationId, orgId)))
    .limit(1);

  if (existingMember) {
    return { linked: false, reason: "already_member" };
  }

  const slug = (env.OIDC_JIT_ROLE_SLUG ?? DEFAULT_JIT_ROLE_SLUG).trim() || DEFAULT_JIT_ROLE_SLUG;
  const [roleRow] = await db
    .select({ id: role.id })
    .from(role)
    .where(and(eq(role.organizationId, orgId), eq(role.slug, slug)))
    .limit(1);

  if (!roleRow) {
    return { linked: false, reason: "role_not_found" };
  }

  const [userRow] = await db
    .select({ email: authUser.email })
    .from(authUser)
    .where(eq(authUser.id, userId))
    .limit(1);

  const [inserted] = await db
    .insert(membership)
    .values({
      userId,
      organizationId: orgId,
      siteId: null,
      roleId: roleRow.id,
    })
    .returning({ id: membership.id });

  await writeAuditLog(db, {
    organizationId: orgId,
    actorUserId: userId,
    action: "oidc_jit.membership_linked",
    entityType: "membership",
    entityId: inserted?.id ?? userId,
    payload: {
      roleSlug: slug,
      subjectEmail: userRow?.email ?? null,
    },
  });

  return { linked: true };
}
