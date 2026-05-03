import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { controlledDocument, documentStatusEnum } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

const docStatuses = documentStatusEnum.enumValues as [string, ...string[]];

export const documentRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.DOCUMENT_READ,
    );

    return ctx.db
      .select()
      .from(controlledDocument)
      .where(eq(controlledDocument.organizationId, input.organizationId))
      .orderBy(desc(controlledDocument.updatedAt));
  }),

  get: protectedProcedure
    .input(
      orgScope.extend({
        documentId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.DOCUMENT_READ,
      );

      const [row] = await ctx.db
        .select()
        .from(controlledDocument)
        .where(
          and(
            eq(controlledDocument.id, input.documentId),
            eq(controlledDocument.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." });
      }

      return row;
    }),

  create: protectedMutation
    .input(
      orgScope.extend({
        title: z.string().min(2).max(512),
        documentNumber: z.string().min(1).max(128),
        revision: z.string().max(32).optional(),
        effectiveDate: z.coerce.date().optional(),
        evidenceUrl: z.string().url().max(2048).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.DOCUMENT_CREATE,
      );

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(controlledDocument)
          .values({
            organizationId: input.organizationId,
            title: input.title,
            documentNumber: input.documentNumber,
            revision: input.revision ?? "1.0",
            effectiveDate: input.effectiveDate ?? null,
            evidenceUrl: input.evidenceUrl ?? null,
            status: "draft",
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create document.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "document.create",
          entityType: "controlled_document",
          entityId: row.id,
          payload: { documentNumber: input.documentNumber },
        });

        return row;
      });
    }),

  updateMetadata: protectedMutation
    .input(
      orgScope.extend({
        documentId: z.string().uuid(),
        title: z.string().min(2).max(512).optional(),
        revision: z.string().max(32).optional(),
        effectiveDate: z.coerce.date().optional().nullable(),
        evidenceUrl: z.string().url().max(2048).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.DOCUMENT_UPDATE,
      );

      const [existing] = await ctx.db
        .select()
        .from(controlledDocument)
        .where(
          and(
            eq(controlledDocument.id, input.documentId),
            eq(controlledDocument.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." });
      }

      if (existing.status === "obsolete") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot edit an obsolete document.",
        });
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(controlledDocument)
          .set({
            title: input.title ?? existing.title,
            revision: input.revision ?? existing.revision,
            effectiveDate:
              input.effectiveDate !== undefined
                ? input.effectiveDate
                : existing.effectiveDate,
            evidenceUrl:
              input.evidenceUrl !== undefined ? input.evidenceUrl : existing.evidenceUrl,
            updatedAt: new Date(),
          })
          .where(eq(controlledDocument.id, input.documentId))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "document.update_metadata",
          entityType: "controlled_document",
          entityId: input.documentId,
          payload: { revision: row?.revision },
        });

        return row;
      });
    }),

  setStatus: protectedMutation
    .input(
      orgScope.extend({
        documentId: z.string().uuid(),
        status: z.enum(docStatuses),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.status === "approved") {
        await assertPermission(
          ctx.db,
          ctx.user.id,
          input.organizationId,
          PERMISSIONS.DOCUMENT_APPROVE,
        );
      } else {
        await assertPermission(
          ctx.db,
          ctx.user.id,
          input.organizationId,
          PERMISSIONS.DOCUMENT_UPDATE,
        );
      }

      const [existing] = await ctx.db
        .select()
        .from(controlledDocument)
        .where(
          and(
            eq(controlledDocument.id, input.documentId),
            eq(controlledDocument.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." });
      }

      return ctx.db.transaction(async (tx) => {
        const approvedAt =
          input.status === "approved" ? new Date() : existing.approvedAt;
        const approvedByUserId =
          input.status === "approved" ? ctx.user.id : existing.approvedByUserId;

        const [row] = await tx
          .update(controlledDocument)
          .set({
            status: input.status as (typeof documentStatusEnum.enumValues)[number],
            approvedAt,
            approvedByUserId,
            updatedAt: new Date(),
          })
          .where(eq(controlledDocument.id, input.documentId))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "document.set_status",
          entityType: "controlled_document",
          entityId: input.documentId,
          payload: { status: input.status },
        });

        return row;
      });
    }),
});