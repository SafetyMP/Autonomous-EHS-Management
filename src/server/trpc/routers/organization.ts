import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  membership,
  organization,
  organizationSetupStep,
  site,
  authUser,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { protectedMutation, protectedProcedure, router } from "../init";

export const organizationRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: organization.id,
        name: organization.name,
      })
      .from(membership)
      .innerJoin(organization, eq(membership.organizationId, organization.id))
      .where(eq(membership.userId, ctx.user.id));
  }),

  sites: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [m] = await ctx.db
        .select()
        .from(membership)
        .where(
          and(
            eq(membership.userId, ctx.user.id),
            eq(membership.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!m) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this organization.",
        });
      }

      return ctx.db
        .select()
        .from(site)
        .where(eq(site.organizationId, input.organizationId));
    }),

  /** Active org members for assignment UIs (CAPA owner, etc.). */
  members: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [m] = await ctx.db
        .select()
        .from(membership)
        .where(
          and(
            eq(membership.userId, ctx.user.id),
            eq(membership.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!m) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this organization.",
        });
      }

      return ctx.db
        .select({
          userId: membership.userId,
          email: authUser.email,
        })
        .from(membership)
        .innerJoin(authUser, eq(membership.userId, authUser.id))
        .where(eq(membership.organizationId, input.organizationId))
        .orderBy(authUser.email);
    }),

  setupSteps: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [m] = await ctx.db
        .select()
        .from(membership)
        .where(
          and(
            eq(membership.userId, ctx.user.id),
            eq(membership.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!m) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this organization.",
        });
      }

      return ctx.db
        .select()
        .from(organizationSetupStep)
        .where(eq(organizationSetupStep.organizationId, input.organizationId));
    }),

  completeSetupStep: protectedMutation
    .input(
      z.object({
        organizationId: z.string().uuid(),
        stepKey: z.string().min(1).max(64),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ORG_SETUP_WRITE,
      );

      return ctx.db.transaction(async (tx) => {
        await tx
          .insert(organizationSetupStep)
          .values({
            organizationId: input.organizationId,
            stepKey: input.stepKey,
            completedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              organizationSetupStep.organizationId,
              organizationSetupStep.stepKey,
            ],
            set: { completedAt: new Date() },
          });

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "org.setup.complete_step",
          entityType: "organization_setup_step",
          entityId: input.stepKey,
        });

        return { ok: true as const };
      });
    }),
});
