import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { dataSubjectRequest, dataSubjectRequestStatusEnum } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { protectedMutation, protectedProcedure, router } from "../init";
import { orgScope } from "../schemas/orgScope";

const statuses = dataSubjectRequestStatusEnum.enumValues as [string, ...string[]];

export const dsarRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.PRIVACY_DSAR_READ,
    );

    return ctx.db
      .select()
      .from(dataSubjectRequest)
      .where(eq(dataSubjectRequest.organizationId, input.organizationId))
      .orderBy(desc(dataSubjectRequest.createdAt))
      .limit(500);
  }),

  create: protectedMutation
    .input(
      orgScope.extend({
        subjectContact: z.string().min(3).max(512),
        requestType: z.string().min(1).max(128),
        notes: z.string().max(20_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.PRIVACY_DSAR_WRITE,
      );

      const [row] = await ctx.db
        .insert(dataSubjectRequest)
        .values({
          organizationId: input.organizationId,
          subjectContact: input.subjectContact,
          requestType: input.requestType,
          notes: input.notes ?? null,
          createdByUserId: ctx.user.id,
        })
        .returning();

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create data subject request.",
        });
      }

      await writeAuditLog(ctx.db, {
        organizationId: input.organizationId,
        actorUserId: ctx.user.id,
        action: "data_subject_request.create",
        entityType: "data_subject_request",
        entityId: row.id,
        payload: {
          requestType: input.requestType,
          status: row.status,
        },
      });

      return row;
    }),

  updateStatus: protectedMutation
    .input(
      orgScope.extend({
        id: z.string().uuid(),
        status: z.enum(statuses),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.PRIVACY_DSAR_WRITE,
      );

      const [updated] = await ctx.db
        .update(dataSubjectRequest)
        .set({
          status: input.status as (typeof dataSubjectRequestStatusEnum.enumValues)[number],
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dataSubjectRequest.id, input.id),
            eq(dataSubjectRequest.organizationId, input.organizationId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Request not found." });
      }

      await writeAuditLog(ctx.db, {
        organizationId: input.organizationId,
        actorUserId: ctx.user.id,
        action: "data_subject_request.update_status",
        entityType: "data_subject_request",
        entityId: updated.id,
        payload: { status: input.status },
      });

      return updated;
    }),
});
