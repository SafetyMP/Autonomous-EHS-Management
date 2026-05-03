import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assertPermission, PERMISSIONS } from "@/lib/rbac";
import {
  createAgentClassClaim,
  deleteAgentClassClaimById,
  listAgentClassClaimsForOrg,
} from "@/server/services/contextSync/agentClassClaim";
import { ContextSyncError } from "@/server/services/contextSync/errors";
import { assertContextSyncEnabledForTrpc } from "@/server/services/contextSync/orgCapability";
import { writeAuditLog } from "@/server/services/audit";
import { protectedMutation, protectedProcedure, router } from "../init";
import { orgScope } from "../schemas/orgScope";

function rethrowCtxSync(err: unknown): never {
  if (!(err instanceof ContextSyncError)) {
    throw err;
  }
  const msg = err.body.message ?? err.body.error ?? "Request failed.";
  switch (err.status) {
    case 400:
      throw new TRPCError({ code: "BAD_REQUEST", message: msg });
    case 403:
      throw new TRPCError({ code: "FORBIDDEN", message: msg });
    case 404:
      throw new TRPCError({ code: "NOT_FOUND", message: msg });
    case 409:
      throw new TRPCError({ code: "CONFLICT", message: msg });
    default:
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
  }
}

/** REST ContextSync adjunct: admin-only agent-class claims for honoring `X-Agent-Class`. */
export const contextSyncProtocolRouter = router({
  agentClassClaimsList: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertContextSyncEnabledForTrpc(ctx.db, input.organizationId);
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.ORG_ADMIN,
    );
    return listAgentClassClaimsForOrg(ctx.db, input.organizationId);
  }),

  agentClassClaimCreate: protectedMutation
    .input(
      orgScope.extend({
        targetUserId: z.string().min(1),
        agentClass: z.string().min(1).max(128),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertContextSyncEnabledForTrpc(ctx.db, input.organizationId);
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ORG_ADMIN,
      );

      try {
        const row = await createAgentClassClaim(ctx.db, {
          organizationId: input.organizationId,
          targetUserId: input.targetUserId.trim(),
          agentClass: input.agentClass,
        });
        await writeAuditLog(ctx.db, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "context_sync.agent_class_claim.create",
          entityType: "context_sync_agent_class_claim",
          entityId: row.id,
          payload: {
            targetUserId: input.targetUserId.trim(),
            agent_class: row.agentClass,
          },
        });
        return row;
      } catch (e) {
        rethrowCtxSync(e);
      }
    }),

  agentClassClaimDelete: protectedMutation
    .input(orgScope.extend({ claimId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertContextSyncEnabledForTrpc(ctx.db, input.organizationId);
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ORG_ADMIN,
      );

      try {
        const result = await deleteAgentClassClaimById(ctx.db, {
          organizationId: input.organizationId,
          claimId: input.claimId,
        });
        await writeAuditLog(ctx.db, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "context_sync.agent_class_claim.delete",
          entityType: "context_sync_agent_class_claim",
          entityId: input.claimId,
          payload: {},
        });
        return result;
      } catch (e) {
        rethrowCtxSync(e);
      }
    }),
});
