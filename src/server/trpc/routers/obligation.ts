import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { complianceObligation, environmentalAspect, obligationAspectLink, obligationOperationalControlLink, operationalControl } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

export const obligationRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.OBLIGATION_READ,
    );

    return ctx.db
      .select()
      .from(complianceObligation)
      .where(eq(complianceObligation.organizationId, input.organizationId));
  }),

  create: protectedMutation
    .input(
      orgScope.extend({
        title: z.string().min(3).max(512),
        requirementType: z.string().min(2).max(128),
        referenceCode: z.string().max(256).optional(),
        nextReviewDue: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.OBLIGATION_CREATE,
      );

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(complianceObligation)
          .values({
            organizationId: input.organizationId,
            title: input.title,
            requirementType: input.requirementType,
            referenceCode: input.referenceCode ?? null,
            nextReviewDue: input.nextReviewDue ?? null,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create obligation.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "obligation.create",
          entityType: "compliance_obligation",
          entityId: row.id,
          payload: { title: input.title },
        });

        return row;
      });
    }),

  update: protectedMutation
    .input(
      orgScope.extend({
        obligationId: z.string().uuid(),
        title: z.string().min(3).max(512).optional(),
        requirementType: z.string().min(2).max(128).optional(),
        referenceCode: z.string().max(256).optional().nullable(),
        nextReviewDue: z.coerce.date().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.OBLIGATION_UPDATE,
      );

      const [existing] = await ctx.db
        .select()
        .from(complianceObligation)
        .where(
          and(
            eq(complianceObligation.id, input.obligationId),
            eq(complianceObligation.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Obligation not found." });
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(complianceObligation)
          .set({
            title: input.title ?? existing.title,
            requirementType: input.requirementType ?? existing.requirementType,
            referenceCode:
              input.referenceCode !== undefined
                ? input.referenceCode
                : existing.referenceCode,
            nextReviewDue:
              input.nextReviewDue !== undefined
                ? input.nextReviewDue
                : existing.nextReviewDue,
            updatedAt: new Date(),
          })
          .where(eq(complianceObligation.id, input.obligationId))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "obligation.update",
          entityType: "compliance_obligation",
          entityId: input.obligationId,
          payload: { title: row?.title },
        });

        return row;
      });
    }),

  linkAspect: protectedMutation
    .input(
      orgScope.extend({
        obligationId: z.string().uuid(),
        aspectId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.OBLIGATION_UPDATE,
      );

      const [o] = await ctx.db
        .select()
        .from(complianceObligation)
        .where(
          and(
            eq(complianceObligation.id, input.obligationId),
            eq(complianceObligation.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      const [a] = await ctx.db
        .select()
        .from(environmentalAspect)
        .where(
          and(
            eq(environmentalAspect.id, input.aspectId),
            eq(environmentalAspect.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!o || !a) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Obligation or aspect not found." });
      }

      return ctx.db.transaction(async (tx) => {
        await tx
          .insert(obligationAspectLink)
          .values({ obligationId: input.obligationId, aspectId: input.aspectId })
          .onConflictDoNothing();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "obligation.link_aspect",
          entityType: "compliance_obligation",
          entityId: input.obligationId,
          payload: { aspectId: input.aspectId },
        });

        return { ok: true as const };
      });
    }),

  unlinkAspect: protectedMutation
    .input(
      orgScope.extend({
        obligationId: z.string().uuid(),
        aspectId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.OBLIGATION_UPDATE,
      );

      const [o] = await ctx.db
        .select()
        .from(complianceObligation)
        .where(
          and(
            eq(complianceObligation.id, input.obligationId),
            eq(complianceObligation.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!o) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Obligation not found." });
      }

      return ctx.db.transaction(async (tx) => {
        await tx
          .delete(obligationAspectLink)
          .where(
            and(
              eq(obligationAspectLink.obligationId, input.obligationId),
              eq(obligationAspectLink.aspectId, input.aspectId),
            ),
          );

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "obligation.unlink_aspect",
          entityType: "compliance_obligation",
          entityId: input.obligationId,
          payload: { aspectId: input.aspectId },
        });

        return { ok: true as const };
      });
    }),

  linkOperationalControl: protectedMutation
    .input(
      orgScope.extend({
        obligationId: z.string().uuid(),
        operationalControlId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.OBLIGATION_UPDATE,
      );

      const [o] = await ctx.db
        .select()
        .from(complianceObligation)
        .where(
          and(
            eq(complianceObligation.id, input.obligationId),
            eq(complianceObligation.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      const [c] = await ctx.db
        .select()
        .from(operationalControl)
        .where(
          and(
            eq(operationalControl.id, input.operationalControlId),
            eq(operationalControl.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!o || !c) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Obligation or operational control not found.",
        });
      }

      return ctx.db.transaction(async (tx) => {
        await tx
          .insert(obligationOperationalControlLink)
          .values({
            obligationId: input.obligationId,
            operationalControlId: input.operationalControlId,
          })
          .onConflictDoNothing();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "obligation.link_control",
          entityType: "compliance_obligation",
          entityId: input.obligationId,
          payload: { operationalControlId: input.operationalControlId },
        });

        return { ok: true as const };
      });
    }),

  unlinkOperationalControl: protectedMutation
    .input(
      orgScope.extend({
        obligationId: z.string().uuid(),
        operationalControlId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.OBLIGATION_UPDATE,
      );

      const [o] = await ctx.db
        .select()
        .from(complianceObligation)
        .where(
          and(
            eq(complianceObligation.id, input.obligationId),
            eq(complianceObligation.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!o) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Obligation not found." });
      }

      return ctx.db.transaction(async (tx) => {
        await tx
          .delete(obligationOperationalControlLink)
          .where(
            and(
              eq(obligationOperationalControlLink.obligationId, input.obligationId),
              eq(
                obligationOperationalControlLink.operationalControlId,
                input.operationalControlId,
              ),
            ),
          );

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "obligation.unlink_control",
          entityType: "compliance_obligation",
          entityId: input.obligationId,
          payload: { operationalControlId: input.operationalControlId },
        });

        return { ok: true as const };
      });
    }),
});
