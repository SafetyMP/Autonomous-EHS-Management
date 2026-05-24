import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  complianceObligation,
  controlledDocument,
  environmentalAspect,
  obligationAspectLink,
  obligationEvidenceLink,
  obligationOperationalControlLink,
  operationalControl,
  ragSource,
} from "@/server/db/schema";
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

  listEvidenceLinks: protectedProcedure
    .input(orgScope.extend({ obligationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.OBLIGATION_READ,
      );

      const [o] = await ctx.db
        .select({ id: complianceObligation.id })
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

      const links = await ctx.db
        .select()
        .from(obligationEvidenceLink)
        .where(eq(obligationEvidenceLink.obligationId, input.obligationId));

      const result = [];
      for (const link of links) {
        let label = link.note ?? "Evidence link";
        let href: string | null = null;
        if (link.controlledDocumentId) {
          const [doc] = await ctx.db
            .select({ title: controlledDocument.title, id: controlledDocument.id })
            .from(controlledDocument)
            .where(eq(controlledDocument.id, link.controlledDocumentId))
            .limit(1);
          if (doc) {
            label = doc.title;
            href = `/dashboard/documents/${doc.id}`;
          }
        } else if (link.ragSourceId) {
          const [src] = await ctx.db
            .select({ title: ragSource.title, id: ragSource.id })
            .from(ragSource)
            .where(
              and(
                eq(ragSource.id, link.ragSourceId),
                eq(ragSource.organizationId, input.organizationId),
              ),
            )
            .limit(1);
          if (src) {
            label = src.title;
            href = `/dashboard/rag`;
          }
        }
        result.push({
          id: link.id,
          controlledDocumentId: link.controlledDocumentId,
          ragSourceId: link.ragSourceId,
          note: link.note,
          label,
          href,
        });
      }
      return result;
    }),

  linkEvidenceDocument: protectedMutation
    .input(
      orgScope.extend({
        obligationId: z.string().uuid(),
        controlledDocumentId: z.string().uuid(),
        note: z.string().max(512).optional(),
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
      const [doc] = await ctx.db
        .select()
        .from(controlledDocument)
        .where(
          and(
            eq(controlledDocument.id, input.controlledDocumentId),
            eq(controlledDocument.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!o || !doc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Obligation or document not found." });
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(obligationEvidenceLink)
          .values({
            obligationId: input.obligationId,
            controlledDocumentId: input.controlledDocumentId,
            note: input.note ?? null,
          })
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "obligation.link_evidence_document",
          entityType: "compliance_obligation",
          entityId: input.obligationId,
          payload: { controlledDocumentId: input.controlledDocumentId },
        });

        return row;
      });
    }),

  linkEvidenceRagSource: protectedMutation
    .input(
      orgScope.extend({
        obligationId: z.string().uuid(),
        ragSourceId: z.string().uuid(),
        note: z.string().max(512).optional(),
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
      const [src] = await ctx.db
        .select()
        .from(ragSource)
        .where(
          and(
            eq(ragSource.id, input.ragSourceId),
            eq(ragSource.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!o || !src) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Obligation or RAG source not found." });
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(obligationEvidenceLink)
          .values({
            obligationId: input.obligationId,
            ragSourceId: input.ragSourceId,
            note: input.note ?? null,
          })
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "obligation.link_evidence_rag",
          entityType: "compliance_obligation",
          entityId: input.obligationId,
          payload: { ragSourceId: input.ragSourceId },
        });

        return row;
      });
    }),

  unlinkEvidence: protectedMutation
    .input(
      orgScope.extend({
        obligationId: z.string().uuid(),
        linkId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.OBLIGATION_UPDATE,
      );

      const [link] = await ctx.db
        .select()
        .from(obligationEvidenceLink)
        .where(eq(obligationEvidenceLink.id, input.linkId))
        .limit(1);
      if (!link || link.obligationId !== input.obligationId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evidence link not found." });
      }

      return ctx.db.transaction(async (tx) => {
        await tx.delete(obligationEvidenceLink).where(eq(obligationEvidenceLink.id, input.linkId));

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "obligation.unlink_evidence",
          entityType: "compliance_obligation",
          entityId: input.obligationId,
          payload: { linkId: input.linkId },
        });

        return { ok: true as const };
      });
    }),
});
