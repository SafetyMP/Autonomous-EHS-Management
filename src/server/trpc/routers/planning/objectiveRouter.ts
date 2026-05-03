import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  managementObjective,
  objectiveStatusEnum,
  objectiveTypeEnum,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { protectedMutation, protectedProcedure, router } from "../../init";
import { orgScope } from "../../schemas/orgScope";
import { objectiveStatuses, objectiveTypes } from "./planningEnums";

export const objectiveRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.OBJECTIVE_READ,
    );

    return ctx.db
      .select()
      .from(managementObjective)
      .where(eq(managementObjective.organizationId, input.organizationId))
      .orderBy(desc(managementObjective.updatedAt));
  }),

  create: protectedMutation
    .input(
      orgScope.extend({
        type: z.enum(objectiveTypes),
        title: z.string().min(2).max(512),
        description: z.string().max(50_000).optional(),
        targetMetrics: z.string().max(50_000).optional(),
        dueDate: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.OBJECTIVE_CREATE,
      );

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(managementObjective)
          .values({
            organizationId: input.organizationId,
            type: input.type as (typeof objectiveTypeEnum.enumValues)[number],
            title: input.title,
            description: input.description ?? null,
            targetMetrics: input.targetMetrics ?? null,
            dueDate: input.dueDate ?? null,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create objective.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "planning.objective.create",
          entityType: "management_objective",
          entityId: row.id,
          payload: { title: input.title },
        });

        return row;
      });
    }),

  update: protectedMutation
    .input(
      orgScope.extend({
        objectiveId: z.string().uuid(),
        title: z.string().min(2).max(512).optional(),
        description: z.string().max(50_000).optional().nullable(),
        targetMetrics: z.string().max(50_000).optional().nullable(),
        dueDate: z.coerce.date().optional().nullable(),
        status: z.enum(objectiveStatuses).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.OBJECTIVE_UPDATE,
      );

      const [existing] = await ctx.db
        .select()
        .from(managementObjective)
        .where(
          and(
            eq(managementObjective.id, input.objectiveId),
            eq(managementObjective.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Objective not found." });
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(managementObjective)
          .set({
            title: input.title ?? existing.title,
            description:
              input.description !== undefined ? input.description : existing.description,
            targetMetrics:
              input.targetMetrics !== undefined
                ? input.targetMetrics
                : existing.targetMetrics,
            dueDate: input.dueDate !== undefined ? input.dueDate : existing.dueDate,
            status:
              (input.status as (typeof objectiveStatusEnum.enumValues)[number] | undefined) ??
              existing.status,
            updatedAt: new Date(),
          })
          .where(eq(managementObjective.id, input.objectiveId))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "planning.objective.update",
          entityType: "management_objective",
          entityId: input.objectiveId,
          payload: {},
        });

        return row;
      });
    }),
});
