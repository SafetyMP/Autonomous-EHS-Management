import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  approvalRequest,
  approvalStep,
  correctiveAction,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { assertOrgMemberUserId } from "../assertOrgScoped";
import { protectedMutation, protectedProcedure, router } from "../init";
import { orgScope } from "../schemas/orgScope";

export const approvalRouter = router({
  listOpenCapaRequests: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.CAPA_READ,
    );
    return ctx.db
      .select()
      .from(approvalRequest)
      .where(
        and(
          eq(approvalRequest.organizationId, input.organizationId),
          eq(approvalRequest.entityType, "capa"),
          eq(approvalRequest.status, "open"),
        ),
      )
      .orderBy(desc(approvalRequest.createdAt));
  }),

  listMyPendingSteps: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.CAPA_APPROVE,
    );

    const rows = await ctx.db
      .select({
        step: approvalStep,
        request: approvalRequest,
      })
      .from(approvalStep)
      .innerJoin(approvalRequest, eq(approvalStep.requestId, approvalRequest.id))
      .where(
        and(
          eq(approvalRequest.organizationId, input.organizationId),
          eq(approvalStep.approverUserId, ctx.user.id),
          eq(approvalStep.status, "pending"),
          eq(approvalRequest.status, "open"),
        ),
      )
      .orderBy(desc(approvalRequest.createdAt), asc(approvalStep.stepOrder));

    return rows;
  }),

  submitCapaPlanApproval: protectedMutation
    .input(
      orgScope.extend({
        correctiveActionId: z.string().uuid(),
        approverUserId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CAPA_UPDATE,
      );

      const [capa] = await ctx.db
        .select()
        .from(correctiveAction)
        .where(
          and(
            eq(correctiveAction.id, input.correctiveActionId),
            eq(correctiveAction.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!capa) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Corrective action not found." });
      }

      if (capa.status !== "pending_approval") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CAPA must be in pending approval to submit an approval request.",
        });
      }

      await assertOrgMemberUserId(ctx.db, input.organizationId, input.approverUserId);

      const open = await ctx.db
        .select({ id: approvalRequest.id })
        .from(approvalRequest)
        .where(
          and(
            eq(approvalRequest.organizationId, input.organizationId),
            eq(approvalRequest.entityType, "capa"),
            eq(approvalRequest.entityId, input.correctiveActionId),
            eq(approvalRequest.status, "open"),
          ),
        )
        .limit(1);

      if (open.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An open approval request already exists for this CAPA.",
        });
      }

      return ctx.db.transaction(async (tx) => {
        const [req] = await tx
          .insert(approvalRequest)
          .values({
            organizationId: input.organizationId,
            entityType: "capa",
            entityId: input.correctiveActionId,
            status: "open",
            createdByUserId: ctx.user.id,
          })
          .returning();

        if (!req) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create approval request.",
          });
        }

        await tx.insert(approvalStep).values({
          requestId: req.id,
          stepOrder: 0,
          approverUserId: input.approverUserId,
          status: "pending",
        });

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "approval.submit_capa",
          entityType: "approval_request",
          entityId: req.id,
          payload: { correctiveActionId: input.correctiveActionId, approverUserId: input.approverUserId },
        });

        return req;
      });
    }),

  decideRequest: protectedMutation
    .input(
      orgScope.extend({
        requestId: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        comment: z.string().max(20_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CAPA_APPROVE,
      );

      const [req] = await ctx.db
        .select()
        .from(approvalRequest)
        .where(
          and(
            eq(approvalRequest.id, input.requestId),
            eq(approvalRequest.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!req) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Approval request not found." });
      }

      if (req.status !== "open") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This approval request is already resolved.",
        });
      }

      const steps = await ctx.db
        .select()
        .from(approvalStep)
        .where(eq(approvalStep.requestId, input.requestId))
        .orderBy(asc(approvalStep.stepOrder));

      const myPending = steps.find((s) => s.status === "pending" && s.approverUserId === ctx.user.id);

      if (!myPending) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not the pending approver on this request.",
        });
      }

      const earlierPending = steps.some(
        (s) => s.stepOrder < myPending.stepOrder && s.status === "pending",
      );
      if (earlierPending) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Earlier approval steps must be completed first.",
        });
      }

      return ctx.db.transaction(async (tx) => {
        const now = new Date();

        await tx
          .update(approvalStep)
          .set({
            status: input.decision === "approved" ? "approved" : "rejected",
            comment: input.comment?.trim() ?? null,
            decidedAt: now,
            updatedAt: now,
          })
          .where(eq(approvalStep.id, myPending.id));

        if (input.decision === "rejected") {
          await tx
            .update(approvalRequest)
            .set({
              status: "rejected",
              resolvedAt: now,
              updatedAt: now,
            })
            .where(eq(approvalRequest.id, req.id));

          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "approval.reject",
            entityType: "approval_request",
            entityId: req.id,
            payload: { entityType: req.entityType, entityId: req.entityId },
          });

          return { status: "rejected" as const };
        }

        const remaining = steps.filter((s) => s.id !== myPending.id && s.status === "pending");
        const allDone = remaining.length === 0;

        if (allDone) {
          await tx
            .update(approvalRequest)
            .set({
              status: "approved",
              resolvedAt: now,
              updatedAt: now,
            })
            .where(eq(approvalRequest.id, req.id));
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: allDone ? "approval.complete" : "approval.step_approved",
          entityType: "approval_request",
          entityId: req.id,
          payload: { entityType: req.entityType, entityId: req.entityId, stepOrder: myPending.stepOrder },
        });

        return { status: allDone ? ("approved" as const) : ("open" as const) };
      });
    }),
});
