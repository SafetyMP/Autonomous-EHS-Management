import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { inspection, inspectionStatusEnum, inspectionTypeEnum } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { runWithMutationIdempotency } from "@/server/services/mutationIdempotency";
import { allowedInspectionTransition } from "@/lib/workflow/inspectionTransitions";
import { assertOrgMemberUserId, assertSiteInOrg } from "../assertOrgScoped";
import { protectedMutation, protectedProcedure, router } from "../init";
import { orgScope } from "../schemas/orgScope";

const inspectionStatuses = inspectionStatusEnum.enumValues as [string, ...string[]];
const inspectionTypes = inspectionTypeEnum.enumValues as [string, ...string[]];

export const inspectionRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.INSPECTION_READ,
    );
    return ctx.db
      .select()
      .from(inspection)
      .where(eq(inspection.organizationId, input.organizationId))
      .orderBy(desc(inspection.scheduledAt), desc(inspection.createdAt));
  }),

  get: protectedProcedure
    .input(orgScope.extend({ inspectionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INSPECTION_READ,
      );
      const [row] = await ctx.db
        .select()
        .from(inspection)
        .where(
          and(
            eq(inspection.id, input.inspectionId),
            eq(inspection.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Inspection not found." });
      }
      return row;
    }),

  create: protectedMutation
    .input(
      orgScope.extend({
        title: z.string().min(2).max(512),
        inspectionType: z.enum(inspectionTypes).optional(),
        siteId: z.string().uuid().optional().nullable(),
        scheduledAt: z.coerce.date().optional().nullable(),
        leadUserId: z.string().min(1).optional().nullable(),
        notes: z.string().max(50_000).optional().nullable(),
        idempotencyKey: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INSPECTION_CREATE,
      );

      if (input.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, input.siteId);
      }
      if (input.leadUserId) {
        await assertOrgMemberUserId(ctx.db, input.organizationId, input.leadUserId);
      }

      const { idempotencyKey, ...inspInput } = input;

      return ctx.db.transaction(async (tx) =>
        runWithMutationIdempotency(
          tx,
          {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            idempotencyKey,
            procedure: "inspection.create",
          },
          async () => {
            const [created] = await tx
              .insert(inspection)
              .values({
                organizationId: inspInput.organizationId,
                siteId: inspInput.siteId ?? null,
                title: inspInput.title.trim(),
                inspectionType: (inspInput.inspectionType ?? "other") as (typeof inspectionTypeEnum.enumValues)[number],
                status: "scheduled",
                scheduledAt: inspInput.scheduledAt ?? null,
                leadUserId: inspInput.leadUserId ?? null,
                notes: inspInput.notes?.trim() ?? null,
              })
              .returning();
            if (!created) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to create inspection.",
              });
            }
            await writeAuditLog(tx, {
              organizationId: inspInput.organizationId,
              actorUserId: ctx.user.id,
              action: "inspection.create",
              entityType: "inspection",
              entityId: created.id,
              payload: { title: created.title, inspectionType: created.inspectionType },
            });
            return created;
          },
        ),
      );
    }),

  update: protectedMutation
    .input(
      orgScope.extend({
        inspectionId: z.string().uuid(),
        title: z.string().min(2).max(512).optional(),
        inspectionType: z.enum(inspectionTypes).optional(),
        siteId: z.string().uuid().optional().nullable(),
        scheduledAt: z.coerce.date().optional().nullable(),
        leadUserId: z.string().min(1).optional().nullable(),
        notes: z.string().max(50_000).optional().nullable(),
        completedAt: z.coerce.date().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INSPECTION_UPDATE,
      );

      const [existing] = await ctx.db
        .select()
        .from(inspection)
        .where(
          and(
            eq(inspection.id, input.inspectionId),
            eq(inspection.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Inspection not found." });
      }
      if (existing.status === "completed" || existing.status === "cancelled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot edit a completed or cancelled inspection.",
        });
      }

      if (input.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, input.siteId);
      }
      if (input.leadUserId) {
        await assertOrgMemberUserId(ctx.db, input.organizationId, input.leadUserId);
      }

      const now = new Date();
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(inspection)
          .set({
            ...(input.title !== undefined ? { title: input.title.trim() } : {}),
            ...(input.inspectionType !== undefined
              ? {
                  inspectionType: input.inspectionType as (typeof inspectionTypeEnum.enumValues)[number],
                }
              : {}),
            ...(input.siteId !== undefined ? { siteId: input.siteId } : {}),
            ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt } : {}),
            ...(input.leadUserId !== undefined ? { leadUserId: input.leadUserId } : {}),
            ...(input.notes !== undefined ? { notes: input.notes?.trim() ?? null } : {}),
            ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
            updatedAt: now,
          })
          .where(eq(inspection.id, input.inspectionId))
          .returning();

        if (row) {
          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "inspection.update",
            entityType: "inspection",
            entityId: row.id,
          });
        }
        return row;
      });
    }),

  updateStatus: protectedMutation
    .input(
      orgScope.extend({
        inspectionId: z.string().uuid(),
        status: z.enum(inspectionStatuses),
        idempotencyKey: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INSPECTION_UPDATE,
      );

      const [existing] = await ctx.db
        .select()
        .from(inspection)
        .where(
          and(
            eq(inspection.id, input.inspectionId),
            eq(inspection.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Inspection not found." });
      }

      const next = input.status as (typeof inspectionStatusEnum.enumValues)[number];
      if (!allowedInspectionTransition(existing.status, next)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid inspection status transition: ${existing.status} → ${next}.`,
        });
      }

      const now = new Date();
      const completedAt = next === "completed" ? now : existing.completedAt;
      const { idempotencyKey, ...stInput } = input;

      return ctx.db.transaction(async (tx) =>
        runWithMutationIdempotency(
          tx,
          {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            idempotencyKey,
            procedure: "inspection.update_status",
          },
          async () => {
            const [row] = await tx
              .update(inspection)
              .set({
                status: next,
                completedAt: next === "completed" ? completedAt : existing.completedAt,
                updatedAt: now,
              })
              .where(eq(inspection.id, stInput.inspectionId))
              .returning();

            if (row) {
              await writeAuditLog(tx, {
                organizationId: input.organizationId,
                actorUserId: ctx.user.id,
                action: "inspection.update_status",
                entityType: "inspection",
                entityId: row.id,
                payload: { from: existing.status, to: next },
              });
            }
            if (!row) {
              throw new TRPCError({ code: "NOT_FOUND", message: "Inspection not found after update." });
            }
            return row;
          },
        ),
      );
    }),
});
