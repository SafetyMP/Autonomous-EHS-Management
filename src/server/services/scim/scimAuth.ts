import { eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { organizationScimConfig } from "@/server/db/schema";
import { hashScimBearerToken } from "./scimToken";

export type ScimAuthContext = {
  organizationId: string;
  defaultRoleSlug: string;
};

/** Resolve org from SCIM bearer token. Returns null when token invalid or SCIM disabled. */
export async function resolveScimAuth(
  db: Db,
  bearerToken: string,
): Promise<ScimAuthContext | null> {
  const hash = hashScimBearerToken(bearerToken);
  const rows = await db
    .select({
      organizationId: organizationScimConfig.organizationId,
      enabled: organizationScimConfig.enabled,
      defaultRoleSlug: organizationScimConfig.defaultRoleSlug,
      bearerTokenHash: organizationScimConfig.bearerTokenHash,
    })
    .from(organizationScimConfig);

  for (const row of rows) {
    if (row.enabled && row.bearerTokenHash === hash) {
      return {
        organizationId: row.organizationId,
        defaultRoleSlug: row.defaultRoleSlug,
      };
    }
  }
  return null;
}

export async function getScimConfigForOrg(
  db: Db,
  organizationId: string,
): Promise<typeof organizationScimConfig.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(organizationScimConfig)
    .where(eq(organizationScimConfig.organizationId, organizationId))
    .limit(1);
  return row ?? null;
}
