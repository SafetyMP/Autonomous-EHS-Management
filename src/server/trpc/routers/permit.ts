import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { allowedWorkPermitTransition, type WorkPermitStatus } from "@/lib/workflow/permitTransitions";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  approvalRequest,
  workPermit,
  workPermitStatusEnum,
  workPermitTypeEnum,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { runWithMutationIdempotency } from "@/server/services/mutationIdempotency";
import { computeDefaultRetainUntilForProgramRecord } from "@/server/services/incidentRetentionDefault";
import { insertWorkPermitApprovalRequestTx } from "@/server/services/workPermitApproval";
import { assertOrgMemberUserId, assertSiteInOrg } from "../assertOrgScoped";
import { protectedMutation, protectedProcedure, router } from "../init";
import { orgScope } from "../schemas/orgScope";

const statuses = workPermitStatusEnum.enumValues as [WorkPermitStatus, ...WorkPermitStatus[]];
const permitTypes = workPermitTypeEnum.enumValues as [
  (typeof workPermitTypeEnum.enumValues)[number],
  ...(typeof workPermitTypeEnum.enumValues)[number][],
];

export const permitRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.WORK_PERMIT_READ);
    return ctx.db
      .select()
      .from(workPermit)
      .where(eq(workPermit.organizationId, input.organizationId))
      .orderBy(desc(workPermit.createdAt));
  }),

  get: protectedProcedure.input(orgScope.extend({ permitId: z.string().uuid() })).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.WORK_PERMIT_READ);
    const [row] = await ctx.db
      .select()
      .from(workPermit)
      .where(and(eq(workPermit.id, input.permitId), eq(workPermit.organizationId, input.organizationId)))
      .limit(1);
    if (!row) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Work permit not found." });
    }
    return row;
  }),

  create: protectedMutation
    .input(
      orgScope.extend({
        title: z.string().min(2).max(512),
        permitType: z.enum(permitTypes).optional(),
        siteId: z.string().uuid().optional().nullable(),
        validFrom: z.coerce.date(),
        validTo: z.coerce.date(),
        workSummary: z.string().min(1).max(50_000),
        hazardsControls: z.string().max(50_000).optional().nullable(),
        idempotencyKey: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.WORK_PERMIT_CREATE);
      if (input.validTo <= input.validFrom) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "validTo must be after validFrom." });
      }
      if (input.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, input.siteId);
      }

      const retainUntilDefault = await computeDefaultRetainUntilForProgramRecord(
        ctx.db,
        input.organizationId,
        input.validFrom,
        "work_permit_program",
      );

      const { idempotencyKey, ...permitCreateInput } = input;

      return ctx.db.transaction(async (tx) =>
        runWithMutationIdempotency(
          tx,
          {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            idempotencyKey,
            procedure: "work_permit.create",
          },
          async () => {
            const [row] = await tx
              .insert(workPermit)
              .values({
                organizationId: permitCreateInput.organizationId,
                siteId: permitCreateInput.siteId ?? null,
                title: permitCreateInput.title.trim(),
                permitType: (permitCreateInput.permitType ?? "other") as (typeof workPermitTypeEnum.enumValues)[number],
                status: "draft",
                requesterUserId: ctx.user.id,
                validFrom: permitCreateInput.validFrom,
                validTo: permitCreateInput.validTo,
                workSummary: permitCreateInput.workSummary.trim(),
                hazardsControls: permitCreateInput.hazardsControls?.trim() ?? null,
                retainUntil: retainUntilDefault,
              })
              .returning();
            if (!row) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to create permit.",
              });
            }
            await writeAuditLog(tx, {
              organizationId: permitCreateInput.organizationId,
              actorUserId: ctx.user.id,
              action: "work_permit.create",
              entityType: "work_permit",
              entityId: row.id,
              payload: { title: row.title },
            });
            return row;
          },
        ),
      );
    }),

  update: protectedMutation
    .input(
      orgScope.extend({
        permitId: z.string().uuid(),
        title: z.string().min(2).max(512).optional(),
        permitType: z.enum(permitTypes).optional(),
        siteId: z.string().uuid().optional().nullable(),
        validFrom: z.coerce.date().optional(),
        validTo: z.coerce.date().optional(),
        workSummary: z.string().min(1).max(50_000).optional(),
        hazardsControls: z.string().max(50_000).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.WORK_PERMIT_UPDATE);
      const [existing] = await ctx.db
        .select()
        .from(workPermit)
        .where(and(eq(workPermit.id, input.permitId), eq(workPermit.organizationId, input.organizationId)))
        .limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Work permit not found." });
      }
      if (!["draft", "pending_approval"].includes(existing.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft or pending permits can be edited this way.",
        });
      }

      const validFrom = input.validFrom ?? existing.validFrom;
      const validTo = input.validTo ?? existing.validTo;
      if (validTo <= validFrom) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "validTo must be after validFrom." });
      }
      if (input.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, input.siteId);
      }

      return ctx.db.transaction(async (tx) => {
        const [upd] = await tx
          .update(workPermit)
          .set({
            title: input.title?.trim() ?? existing.title,
            permitType: (input.permitType ?? existing.permitType) as (typeof workPermitTypeEnum.enumValues)[number],
            siteId: input.siteId === undefined ? existing.siteId : input.siteId,
            validFrom,
            validTo,
            workSummary: input.workSummary?.trim() ?? existing.workSummary,
            hazardsControls:
              input.hazardsControls !== undefined ? (input.hazardsControls ?? null) : existing.hazardsControls,
            updatedAt: new Date(),
          })
          .where(eq(workPermit.id, existing.id))
          .returning();
        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "work_permit.update",
          entityType: "work_permit",
          entityId: existing.id,
          payload: { fieldsTouched: Object.keys(input).filter((k) => k !== "permitId") },
        });
        return upd;
      });
    }),

  setProgramRetention: protectedMutation
    .input(
      orgScope
        .extend({
          permitId: z.string().uuid(),
          retainUntil: z.coerce.date().nullable().optional(),
          legalHold: z.boolean().optional(),
        })
        .refine((i) => i.retainUntil !== undefined || i.legalHold !== undefined, {
          message: "Provide retainUntil and/or legalHold.",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.WORK_PERMIT_READ);
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.RETENTION_POLICY_WRITE);
      const [existing] = await ctx.db
        .select()
        .from(workPermit)
        .where(and(eq(workPermit.id, input.permitId), eq(workPermit.organizationId, input.organizationId)))
        .limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Work permit not found." });
      }

      return ctx.db.transaction(async (tx) => {
        const [upd] = await tx
          .update(workPermit)
          .set({
            retainUntil:
              input.retainUntil !== undefined ? (input.retainUntil ?? null) : existing.retainUntil,
            legalHold: input.legalHold !== undefined ? input.legalHold : existing.legalHold,
            updatedAt: new Date(),
          })
          .where(eq(workPermit.id, existing.id))
          .returning();
        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "work_permit.set_program_retention",
          entityType: "work_permit",
          entityId: existing.id,
          payload: {
            retainUntil:
              input.retainUntil !== undefined ? (input.retainUntil?.toISOString() ?? null) : undefined,
            legalHold: input.legalHold,
          },
        });
        return upd;
      });
    }),

  submitForApproval: protectedMutation
    .input(
      orgScope
        .extend({
          permitId: z.string().uuid(),
          approverUserId: z.string().min(1).optional(),
          approvers: z.array(z.string().min(1)).min(1).max(5).optional(),
          slaDaysPerStep: z.number().int().min(1).max(90).optional(),
        })
        .refine(
          (i) =>
            (i.approvers !== undefined && i.approvers.length > 0) ||
            (i.approverUserId !== undefined && i.approverUserId.length > 0),
          { message: "Provide approverUserId or approvers.", path: ["approverUserId"] },
        )
        .extend({
          idempotencyKey: z.string().uuid().optional(),
        }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.WORK_PERMIT_UPDATE);
      const [existing] = await ctx.db
        .select()
        .from(workPermit)
        .where(and(eq(workPermit.id, input.permitId), eq(workPermit.organizationId, input.organizationId)))
        .limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Work permit not found." });
      }
      if (existing.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft permits can be submitted.",
        });
      }

      const approverList = input.approvers?.length
        ? [...new Set(input.approvers)]
        : input.approverUserId
          ? [input.approverUserId]
          : [];
      if (approverList.length === 0 || approverList.length > 5) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Provide 1–5 distinct approvers." });
      }

      for (const uid of approverList) {
        await assertOrgMemberUserId(ctx.db, input.organizationId, uid);
      }

      const open = await ctx.db
        .select({ id: approvalRequest.id })
        .from(approvalRequest)
        .where(
          and(
            eq(approvalRequest.organizationId, input.organizationId),
            eq(approvalRequest.entityType, "work_permit"),
            eq(approvalRequest.entityId, input.permitId),
            eq(approvalRequest.status, "open"),
          ),
        )
        .limit(1);

      if (open.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An open approval request already exists for this permit.",
        });
      }

      const { idempotencyKey, slaDaysPerStep, ...submitInput } = input;

      return ctx.db.transaction(async (tx) =>
        runWithMutationIdempotency(
          tx,
          {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            idempotencyKey,
            procedure: "work_permit.submit_for_approval",
          },
          async () => {
            await insertWorkPermitApprovalRequestTx(tx, {
              organizationId: submitInput.organizationId,
              workPermitId: submitInput.permitId,
              approverUserIds: approverList,
              actorUserId: ctx.user.id,
              slaDaysPerStep,
            });

            const now = new Date();
            const [upd] = await tx
              .update(workPermit)
              .set({ status: "pending_approval", updatedAt: now })
              .where(eq(workPermit.id, existing.id))
              .returning();

            await writeAuditLog(tx, {
              organizationId: submitInput.organizationId,
              actorUserId: ctx.user.id,
              action: "work_permit.submit_approval",
              entityType: "work_permit",
              entityId: existing.id,
              payload: { approverCount: approverList.length },
            });

            if (!upd) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Permit submit did not return a row.",
              });
            }
            return upd;
          },
        ),
      );
    }),

  updateStatus: protectedMutation
    .input(
      orgScope.extend({
        permitId: z.string().uuid(),
        toStatus: z.enum(statuses),
        cancelReason: z.string().max(20_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.WORK_PERMIT_UPDATE);
      const [existing] = await ctx.db
        .select()
        .from(workPermit)
        .where(and(eq(workPermit.id, input.permitId), eq(workPermit.organizationId, input.organizationId)))
        .limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Work permit not found." });
      }

      if (!allowedWorkPermitTransition(existing, input.toStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That status transition is not allowed.",
        });
      }

      const now = new Date();
      return ctx.db.transaction(async (tx) => {
        if (existing.status === "pending_approval" && input.toStatus === "cancelled") {
          await tx
            .update(approvalRequest)
            .set({
              status: "cancelled",
              resolvedAt: now,
              updatedAt: now,
            })
            .where(
              and(
                eq(approvalRequest.organizationId, input.organizationId),
                eq(approvalRequest.entityType, "work_permit"),
                eq(approvalRequest.entityId, existing.id),
                eq(approvalRequest.status, "open"),
              ),
            );
        }

        await tx
          .update(workPermit)
          .set({
            status: input.toStatus as (typeof workPermitStatusEnum.enumValues)[number],
            updatedAt: now,
            cancelReason:
              input.toStatus === "cancelled" && input.cancelReason?.trim()
                ? input.cancelReason.trim()
                : existing.cancelReason,
            completedAt: input.toStatus === "completed" ? now : existing.completedAt,
          })
          .where(eq(workPermit.id, existing.id));

        const [upd] = await tx
          .select()
          .from(workPermit)
          .where(eq(workPermit.id, existing.id))
          .limit(1);

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "work_permit.status",
          entityType: "work_permit",
          entityId: existing.id,
          payload: {
            from: existing.status,
            to: input.toStatus,
          },
        });
        return upd;
      });
    }),
});
