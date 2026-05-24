import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import {
  authAccount,
  authUser,
  membership,
  oidcJitClaimRule,
  organization,
  role,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { readValidatedEnv } from "@/server/read-env";
import { claimValuesFromPayload, decodeJwtPayload } from "@/lib/oidc/claimParser";

const DEFAULT_JIT_ROLE_SLUG = "admin";

function oidcProviderIdForAccountMatch(): string {
  return readValidatedEnv().OIDC_PROVIDER_ID ?? "enterprise-oidc";
}

type JitMatch = {
  organizationId: string;
  roleSlug: string;
  matchValue: string;
  claimKey: string;
};

async function findOidcJitMatch(db: Db, userId: string): Promise<JitMatch | null> {
  const providerId = oidcProviderIdForAccountMatch();
  const [oauthAccount] = await db
    .select({ idToken: authAccount.idToken })
    .from(authAccount)
    .where(and(eq(authAccount.userId, userId), eq(authAccount.providerId, providerId)))
    .limit(1);

  if (!oauthAccount?.idToken) return null;

  const payload = decodeJwtPayload(oauthAccount.idToken);
  if (!payload) return null;

  const rules = await db
    .select()
    .from(oidcJitClaimRule)
    .where(eq(oidcJitClaimRule.enabled, true))
    .orderBy(asc(oidcJitClaimRule.priority), asc(oidcJitClaimRule.createdAt));

  for (const rule of rules) {
    const values = claimValuesFromPayload(payload, rule.claimKey);
    if (values.includes(rule.matchValue)) {
      return {
        organizationId: rule.organizationId,
        roleSlug: rule.roleSlug,
        matchValue: rule.matchValue,
        claimKey: rule.claimKey,
      };
    }
  }

  return null;
}

async function linkMembership(
  db: Db,
  userId: string,
  orgId: string,
  roleSlug: string,
  auditAction: string,
  auditPayload: Record<string, unknown>,
): Promise<{ linked: boolean; reason?: string }> {
  const [orgRow] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  if (!orgRow) {
    return { linked: false, reason: "org_not_found" };
  }

  const [existingMember] = await db
    .select({ id: membership.id })
    .from(membership)
    .where(and(eq(membership.userId, userId), eq(membership.organizationId, orgId)))
    .limit(1);

  if (existingMember) {
    return { linked: false, reason: "already_member" };
  }

  const slug = roleSlug.trim() || DEFAULT_JIT_ROLE_SLUG;
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
    action: auditAction,
    entityType: "membership",
    entityId: inserted?.id ?? userId,
    payload: {
      roleSlug: slug,
      subjectEmail: userRow?.email ?? null,
      ...auditPayload,
    },
  });

  return { linked: true };
}

/**
 * After OAuth/OIDC sign-in, link the user via claim rules or legacy single-org env.
 */
export async function provisionOidcJitMembershipIfEnabled(
  db: Db,
  userId: string,
): Promise<{ linked: boolean; reason?: string }> {
  const env = readValidatedEnv();
  if (env.OIDC_JIT_ENABLED !== "true") {
    return { linked: false, reason: "jit_disabled" };
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

  const claimMatch = await findOidcJitMatch(db, userId);
  if (claimMatch) {
    return linkMembership(db, userId, claimMatch.organizationId, claimMatch.roleSlug, "oidc_jit.claim_rule_linked", {
      claimKey: claimMatch.claimKey,
      matchValue: claimMatch.matchValue,
    });
  }

  const allowDefaultOrg = env.OIDC_JIT_ALLOW_DEFAULT_ORG !== "false";
  if (!allowDefaultOrg) {
    return { linked: false, reason: "no_claim_match_fail_closed" };
  }

  const orgId = env.OIDC_JIT_DEFAULT_ORG_ID?.trim();
  if (!orgId) {
    return { linked: false, reason: "no_claim_match_and_no_default_org" };
  }

  const slug = (env.OIDC_JIT_ROLE_SLUG ?? DEFAULT_JIT_ROLE_SLUG).trim() || DEFAULT_JIT_ROLE_SLUG;
  return linkMembership(db, userId, orgId, slug, "oidc_jit.membership_linked", {
    source: "env_default_org",
  });
}
