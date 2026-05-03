import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { hazard } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { assertSiteInOrg } from "../../assertOrgScoped";
import { protectedMutation, protectedProcedure, router } from "../../init";
import { orgScope } from "../../schemas/orgScope";

export const hazardRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.HAZARD_READ,
    );

    return ctx.db
      .select()
      .from(hazard)
      .where(eq(hazard.organizationId, input.organizationId))
      .orderBy(desc(hazard.updatedAt));
  }),

  get: protectedProcedure
    .input(orgScope.extend({ hazardId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.HAZARD_READ,
      );

      const [row] = await ctx.db
        .select()
        .from(hazard)
        .where(
          and(eq(hazard.id, input.hazardId), eq(hazard.organizationId, input.organizationId)),
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Hazard not found." });
      }

      return row;
    }),

  create: protectedMutation
    .input(
      orgScope.extend({
        siteId: z.string().uuid().optional(),
        title: z.string().min(2).max(512),
        description: z.string().max(50_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.HAZARD_CREATE,
      );

      if (input.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, input.siteId);
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(hazard)
          .values({
            organizationId: input.organizationId,
            siteId: input.siteId ?? null,
            title: input.title,
            description: input.description ?? null,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create hazard.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "planning.hazard.create",
          entityType: "hazard",
          entityId: row.id,
          payload: { title: input.title },
        });

        return row;
      });
    }),

  update: protectedMutation
    .input(
      orgScope.extend({
        hazardId: z.string().uuid(),
        siteId: z.string().uuid().optional().nullable(),
        title: z.string().min(2).max(512).optional(),
        description: z.string().max(50_000).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.HAZARD_UPDATE,
      );

      const [existing] = await ctx.db
        .select()
        .from(hazard)
        .where(
          and(eq(hazard.id, input.hazardId), eq(hazard.organizationId, input.organizationId)),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Hazard not found." });
      }

      if (input.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, input.siteId);
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(hazard)
          .set({
            siteId: input.siteId !== undefined ? input.siteId : existing.siteId,
            title: input.title ?? existing.title,
            description:
              input.description !== undefined ? input.description : existing.description,
            updatedAt: new Date(),
          })
          .where(eq(hazard.id, input.hazardId))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "planning.hazard.update",
          entityType: "hazard",
          entityId: input.hazardId,
          payload: { title: row?.title },
        });

        return row;
      });
    }),
});
