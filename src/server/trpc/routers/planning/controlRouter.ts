import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { operationalControl } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import {
  assertAspectInOrg,
  assertHazardInOrg,
} from "../../assertOrgScoped";
import { protectedMutation, protectedProcedure, router } from "../../init";
import { orgScope } from "../../schemas/orgScope";

export const operationalControlRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.CONTROL_READ,
    );

    return ctx.db
      .select()
      .from(operationalControl)
      .where(eq(operationalControl.organizationId, input.organizationId))
      .orderBy(desc(operationalControl.updatedAt));
  }),

  create: protectedMutation
    .input(
      orgScope.extend({
        title: z.string().min(2).max(512),
        description: z.string().max(50_000).optional(),
        environmentalAspectId: z.string().uuid().optional(),
        hazardId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CONTROL_CREATE,
      );

      if (input.environmentalAspectId) {
        await assertAspectInOrg(
          ctx.db,
          input.organizationId,
          input.environmentalAspectId,
        );
      }
      if (input.hazardId) {
        await assertHazardInOrg(ctx.db, input.organizationId, input.hazardId);
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(operationalControl)
          .values({
            organizationId: input.organizationId,
            title: input.title,
            description: input.description ?? null,
            environmentalAspectId: input.environmentalAspectId ?? null,
            hazardId: input.hazardId ?? null,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create operational control.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "planning.control.create",
          entityType: "operational_control",
          entityId: row.id,
          payload: { title: input.title },
        });

        return row;
      });
    }),

  update: protectedMutation
    .input(
      orgScope.extend({
        operationalControlId: z.string().uuid(),
        title: z.string().min(2).max(512).optional(),
        description: z.string().max(50_000).optional().nullable(),
        environmentalAspectId: z.string().uuid().optional().nullable(),
        hazardId: z.string().uuid().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CONTROL_UPDATE,
      );

      const [existing] = await ctx.db
        .select()
        .from(operationalControl)
        .where(
          and(
            eq(operationalControl.id, input.operationalControlId),
            eq(operationalControl.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Operational control not found." });
      }

      if (input.environmentalAspectId) {
        await assertAspectInOrg(ctx.db, input.organizationId, input.environmentalAspectId);
      }
      if (input.hazardId) {
        await assertHazardInOrg(ctx.db, input.organizationId, input.hazardId);
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(operationalControl)
          .set({
            title: input.title ?? existing.title,
            description:
              input.description !== undefined ? input.description : existing.description,
            environmentalAspectId:
              input.environmentalAspectId !== undefined
                ? input.environmentalAspectId
                : existing.environmentalAspectId,
            hazardId: input.hazardId !== undefined ? input.hazardId : existing.hazardId,
            updatedAt: new Date(),
          })
          .where(eq(operationalControl.id, input.operationalControlId))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "planning.control.update",
          entityType: "operational_control",
          entityId: input.operationalControlId,
          payload: { title: row?.title },
        });

        return row;
      });
    }),
});
