import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { managementReview } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

export const managementReviewRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.MR_READ,
    );

    return ctx.db
      .select()
      .from(managementReview)
      .where(eq(managementReview.organizationId, input.organizationId))
      .orderBy(desc(managementReview.reviewDate));
  }),

  create: protectedMutation
    .input(
      orgScope.extend({
        reviewDate: z.coerce.date(),
        summary: z.string().min(10).max(50_000),
        actionItems: z.string().max(50_000).optional(),
        nextReviewDue: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.MR_CREATE,
      );

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(managementReview)
          .values({
            organizationId: input.organizationId,
            reviewDate: input.reviewDate,
            summary: input.summary,
            actionItems: input.actionItems ?? null,
            nextReviewDue: input.nextReviewDue ?? null,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create management review record.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "management_review.create",
          entityType: "management_review",
          entityId: row.id,
          payload: { reviewDate: input.reviewDate.toISOString() },
        });

        return row;
      });
    }),

  update: protectedMutation
    .input(
      orgScope.extend({
        reviewId: z.string().uuid(),
        summary: z.string().min(10).max(50_000).optional(),
        actionItems: z.string().max(50_000).optional().nullable(),
        nextReviewDue: z.coerce.date().optional().nullable(),
        reviewDate: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.MR_UPDATE,
      );

      const [existing] = await ctx.db
        .select()
        .from(managementReview)
        .where(
          and(
            eq(managementReview.id, input.reviewId),
            eq(managementReview.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Review not found." });
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(managementReview)
          .set({
            summary: input.summary ?? existing.summary,
            actionItems:
              input.actionItems !== undefined
                ? input.actionItems
                : existing.actionItems,
            nextReviewDue:
              input.nextReviewDue !== undefined
                ? input.nextReviewDue
                : existing.nextReviewDue,
            reviewDate: input.reviewDate ?? existing.reviewDate,
            updatedAt: new Date(),
          })
          .where(eq(managementReview.id, input.reviewId))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "management_review.update",
          entityType: "management_review",
          entityId: input.reviewId,
          payload: {},
        });

        return row;
      });
    }),
});
