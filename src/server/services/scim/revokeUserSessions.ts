import { eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { authSession } from "@/server/db/schema";
import { userHasMembershipOutsideOrg } from "./crossTenantIdentity";

export type RevokeSessionsResult = {
  revoked: number;
  skippedReason?: "cross_tenant_memberships";
};

/**
 * Revoke Better Auth sessions for a user during SCIM/HRIS deprovision.
 * Skips when the user still has memberships in other orgs (sessions are global).
 */
export async function revokeUserSessions(
  db: Pick<Db, "delete" | "select">,
  userId: string,
  organizationId: string,
): Promise<RevokeSessionsResult> {
  if (await userHasMembershipOutsideOrg(db, userId, organizationId)) {
    return { revoked: 0, skippedReason: "cross_tenant_memberships" };
  }
  const deleted = await db
    .delete(authSession)
    .where(eq(authSession.userId, userId))
    .returning({ id: authSession.id });
  return { revoked: deleted.length };
}
