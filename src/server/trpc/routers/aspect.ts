import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  aspectSignificanceEnum,
  environmentalAspect,
  site,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

const significances = aspectSignificanceEnum.enumValues as [
  string,
  ...string[],
];

export const aspectRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.ASPECT_READ,
    );

    return ctx.db
      .select()
      .from(environmentalAspect)
      .where(eq(environmentalAspect.organizationId, input.organizationId));
  }),

  create: protectedMutation
    .input(
      orgScope.extend({
        siteId: z.string().uuid().optional(),
        activity: z.string().max(512).optional(),
        name: z.string().min(2).max(512),
        description: z.string().max(20_000).optional(),
        environmentalImpact: z.string().max(20_000).optional(),
        significance: z.enum(significances),
        climateRelevant: z.boolean().optional(),
        biodiversityRelevant: z.boolean().optional(),
        lifecyclePerspectiveNote: z.string().max(20_000).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ASPECT_CREATE,
      );

      if (input.siteId) {
        const [s] = await ctx.db
          .select()
          .from(site)
          .where(
            and(
              eq(site.id, input.siteId),
              eq(site.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!s) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Site does not belong to organization.",
          });
        }
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(environmentalAspect)
          .values({
            organizationId: input.organizationId,
            siteId: input.siteId ?? null,
            activity: input.activity ?? null,
            name: input.name,
            description: input.description ?? null,
            environmentalImpact: input.environmentalImpact ?? null,
            significance: input.significance as (typeof aspectSignificanceEnum.enumValues)[number],
            climateRelevant: input.climateRelevant ?? false,
            biodiversityRelevant: input.biodiversityRelevant ?? false,
            lifecyclePerspectiveNote: input.lifecyclePerspectiveNote ?? null,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create environmental aspect.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "aspect.create",
          entityType: "environmental_aspect",
          entityId: row.id,
          payload: { name: input.name },
        });

        return row;
      });
    }),

  update: protectedMutation
    .input(
      orgScope.extend({
        aspectId: z.string().uuid(),
        activity: z.string().max(512).optional().nullable(),
        name: z.string().min(2).max(512).optional(),
        description: z.string().max(20_000).optional().nullable(),
        environmentalImpact: z.string().max(20_000).optional().nullable(),
        significance: z.enum(significances).optional(),
        siteId: z.string().uuid().optional().nullable(),
        climateRelevant: z.boolean().optional(),
        biodiversityRelevant: z.boolean().optional(),
        lifecyclePerspectiveNote: z.string().max(20_000).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ASPECT_UPDATE,
      );

      const [existing] = await ctx.db
        .select()
        .from(environmentalAspect)
        .where(
          and(
            eq(environmentalAspect.id, input.aspectId),
            eq(environmentalAspect.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Aspect not found." });
      }

      if (input.siteId) {
        const [s] = await ctx.db
          .select()
          .from(site)
          .where(
            and(
              eq(site.id, input.siteId),
              eq(site.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!s) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Site does not belong to organization.",
          });
        }
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(environmentalAspect)
          .set({
            siteId: input.siteId !== undefined ? input.siteId : existing.siteId,
            activity: input.activity !== undefined ? input.activity : existing.activity,
            name: input.name ?? existing.name,
            description:
              input.description !== undefined ? input.description : existing.description,
            environmentalImpact:
              input.environmentalImpact !== undefined
                ? input.environmentalImpact
                : existing.environmentalImpact,
            significance: (input.significance ??
              existing.significance) as (typeof aspectSignificanceEnum.enumValues)[number],
            climateRelevant:
              input.climateRelevant !== undefined
                ? input.climateRelevant
                : existing.climateRelevant,
            biodiversityRelevant:
              input.biodiversityRelevant !== undefined
                ? input.biodiversityRelevant
                : existing.biodiversityRelevant,
            lifecyclePerspectiveNote:
              input.lifecyclePerspectiveNote !== undefined
                ? input.lifecyclePerspectiveNote
                : existing.lifecyclePerspectiveNote,
            updatedAt: new Date(),
          })
          .where(eq(environmentalAspect.id, input.aspectId))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "aspect.update",
          entityType: "environmental_aspect",
          entityId: input.aspectId,
          payload: { name: row?.name },
        });

        return row;
      });
    }),
});
