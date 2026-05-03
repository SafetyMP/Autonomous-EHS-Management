import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { contextSyncAgentClassClaim } from "@/server/db/schema";
import { ContextSyncError } from "@/server/services/contextSync/errors";

export async function listAgentClassClaimsForOrg(db: Db, organizationId: string) {
  return db
    .select()
    .from(contextSyncAgentClassClaim)
    .where(eq(contextSyncAgentClassClaim.organizationId, organizationId))
    .orderBy(asc(contextSyncAgentClassClaim.agentClass));
}

export async function createAgentClassClaim(
  db: Db,
  input: {
    organizationId: string;
    targetUserId: string;
    agentClass: string;
  },
) {
  const agentClass = input.agentClass.trim();
  if (!agentClass) {
    throw new ContextSyncError(400, {
      error: "bad_request",
      message: "agent_class cannot be empty",
    });
  }

  try {
    const [row] = await db
      .insert(contextSyncAgentClassClaim)
      .values({
        organizationId: input.organizationId,
        userId: input.targetUserId,
        agentClass,
      })
      .returning();

    if (!row) {
      throw new ContextSyncError(500, { error: "internal", message: "Insert failed." });
    }

    return row;
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "23505"
    ) {
      throw new ContextSyncError(409, {
        error: "conflict",
        message: "This user already has a claim for that agent_class in this org.",
      });
    }
    throw e;
  }
}

export async function deleteAgentClassClaimById(
  db: Db,
  input: { organizationId: string; claimId: string },
) {
  const [existing] = await db
    .select()
    .from(contextSyncAgentClassClaim)
    .where(
      and(
        eq(contextSyncAgentClassClaim.id, input.claimId),
        eq(contextSyncAgentClassClaim.organizationId, input.organizationId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new ContextSyncError(404, {
      error: "not_found",
      message: "Agent class claim not found",
    });
  }

  await db
    .delete(contextSyncAgentClassClaim)
    .where(eq(contextSyncAgentClassClaim.id, input.claimId));

  return { deleted: true as const };
}
