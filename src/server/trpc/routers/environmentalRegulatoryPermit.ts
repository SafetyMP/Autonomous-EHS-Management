import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  approvalRequest,
  complianceObligation,
  environmentalRegulatoryPermit,
  environmentalRegulatoryPermitCondition,
  environmentalRegulatoryPermitMediaEnum,
  environmentalRegulatoryPermitStatusEnum,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { insertEnvironmentalRegulatoryPermitApprovalRequestTx } from "@/server/services/environmentalRegulatoryPermitApproval";
import { computeDefaultRetainUntilForProgramRecord } from "@/server/services/incidentRetentionDefault";
import { runWithMutationIdempotency } from "@/server/services/mutationIdempotency";
import {
  assertOrgMemberUserId,
  assertSiteInOrg,
} from "../assertOrgScoped";
import { protectedMutation, protectedProcedure, router } from "../init";
import { orgScope } from "../schemas/orgScope";

const mediaValues = environmentalRegulatoryPermitMediaEnum.enumValues as [
  string,
  ...string[],
];
const statusValues = environmentalRegulatoryPermitStatusEnum.enumValues as [
  string,
  ...string[],
];

const limitsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional();

const conditionInput = z.object({
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  conditionText: z.string().min(1).max(50_000),
  referenceCode: z.string().max(256).optional().nullable(),
});

export const environmentalRegulatoryPermitRouter = router({
  list: protectedProcedure
    .input(
      orgScope.extend({
        status: z.enum(statusValues).optional(),
        siteId: z.string().uuid().optional(),
        media: z.enum(mediaValues).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ENVIRONMENTAL_PERMIT_READ,
      );

      const conds = [
        eq(environmentalRegulatoryPermit.organizationId, input.organizationId),
      ] as const;
      const parts: typeof conds[number][] = [...conds];
      if (input.status) {
        parts.push(
          eq(
            environmentalRegulatoryPermit.status,
            input.status as (typeof environmentalRegulatoryPermitStatusEnum.enumValues)[number],
          ),
        );
      }
      if (input.siteId) {
        parts.push(eq(environmentalRegulatoryPermit.siteId, input.siteId));
      }
      if (input.media) {
        parts.push(
          eq(
            environmentalRegulatoryPermit.media,
            input.media as (typeof environmentalRegulatoryPermitMediaEnum.enumValues)[number],
          ),
        );
      }

      return ctx.db
        .select()
        .from(environmentalRegulatoryPermit)
        .where(and(...parts))
        .orderBy(desc(environmentalRegulatoryPermit.updatedAt));
    }),

  get: protectedProcedure
    .input(orgScope.extend({ permitId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ENVIRONMENTAL_PERMIT_READ,
      );

      const [row] = await ctx.db
        .select()
        .from(environmentalRegulatoryPermit)
        .where(
          and(
            eq(environmentalRegulatoryPermit.id, input.permitId),
            eq(environmentalRegulatoryPermit.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Environmental permit not found." });
      }

      const conditions = await ctx.db
        .select()
        .from(environmentalRegulatoryPermitCondition)
        .where(eq(environmentalRegulatoryPermitCondition.permitId, input.permitId))
        .orderBy(asc(environmentalRegulatoryPermitCondition.sortOrder));

      return { permit: row, conditions };
    }),

  create: protectedMutation
    .input(
      orgScope.extend({
        title: z.string().min(2).max(512),
        permitIdentifier: z.string().min(1).max(256),
        agency: z.string().max(256).optional().nullable(),
        jurisdiction: z.string().max(256).optional().nullable(),
        media: z.enum(mediaValues).optional(),
        status: z.enum(statusValues).optional(),
        siteId: z.string().uuid().optional().nullable(),
        issuedAt: z.coerce.date().optional().nullable(),
        effectiveFrom: z.coerce.date().optional().nullable(),
        expiresAt: z.coerce.date().optional().nullable(),
        legalCitations: z.string().max(50_000).optional().nullable(),
        limits: limitsSchema,
        complianceObligationId: z.string().uuid().optional().nullable(),
        ownerUserId: z.string().optional().nullable(),
        conditions: z.array(conditionInput).max(200).optional(),
        idempotencyKey: z.string().uuid().optional(),
      })
        .refine((i) => i.status !== "pending_approval", {
          message: "Use submit for approval to enter pending approval.",
          path: ["status"],
        }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ENVIRONMENTAL_PERMIT_CREATE,
      );

      if (input.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, input.siteId);
      }
      if (input.complianceObligationId) {
        const [o] = await ctx.db
          .select()
          .from(complianceObligation)
          .where(
            and(
              eq(complianceObligation.id, input.complianceObligationId),
              eq(complianceObligation.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!o) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Obligation not found." });
        }
      }
      if (input.ownerUserId) {
        await assertOrgMemberUserId(ctx.db, input.organizationId, input.ownerUserId);
      }

      const refDate = input.effectiveFrom ?? input.issuedAt ?? new Date();
      const retainUntilDefault = await computeDefaultRetainUntilForProgramRecord(
        ctx.db,
        input.organizationId,
        refDate,
        "environmental_regulatory_permit_program",
      );

      const { idempotencyKey, ...createInput } = input;

      return ctx.db.transaction(async (tx) =>
        runWithMutationIdempotency(
          tx,
          {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            idempotencyKey,
            procedure: "environmental_regulatory_permit.create",
          },
          async () => {
            const [row] = await tx
              .insert(environmentalRegulatoryPermit)
              .values({
                organizationId: createInput.organizationId,
                siteId: createInput.siteId ?? null,
                title: createInput.title.trim(),
                permitIdentifier: createInput.permitIdentifier.trim(),
                agency: createInput.agency?.trim() ?? null,
                jurisdiction: createInput.jurisdiction?.trim() ?? null,
                media: (createInput.media ?? "general") as (typeof environmentalRegulatoryPermitMediaEnum.enumValues)[number],
                status: (createInput.status ?? "draft") as (typeof environmentalRegulatoryPermitStatusEnum.enumValues)[number],
                issuedAt: createInput.issuedAt ?? null,
                effectiveFrom: createInput.effectiveFrom ?? null,
                expiresAt: createInput.expiresAt ?? null,
                legalCitations: createInput.legalCitations?.trim() ?? null,
                limits: (createInput.limits ?? null) as Record<string, unknown> | null,
                complianceObligationId: createInput.complianceObligationId ?? null,
                ownerUserId: createInput.ownerUserId ?? null,
                retainUntil: retainUntilDefault,
                updatedAt: new Date(),
              })
              .returning();

            if (!row) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to create environmental permit.",
              });
            }

            if (createInput.conditions?.length) {
              await tx.insert(environmentalRegulatoryPermitCondition).values(
                createInput.conditions.map((c, i) => ({
                  permitId: row.id,
                  sortOrder: c.sortOrder ?? i,
                  conditionText: c.conditionText.trim(),
                  referenceCode: c.referenceCode?.trim() ?? null,
                })),
              );
            }

            await writeAuditLog(tx, {
              organizationId: createInput.organizationId,
              actorUserId: ctx.user.id,
              action: "environmental_regulatory_permit.create",
              entityType: "environmental_regulatory_permit",
              entityId: row.id,
              payload: { permitIdentifier: row.permitIdentifier },
            });

            return row;
          },
        ),
      );
    }),

  submitForApproval: protectedMutation
    .input(
      orgScope
        .extend({
          permitId: z.string().uuid(),
          approverUserId: z.string().min(1).optional(),
          approvers: z.array(z.string().min(1)).min(1).max(5).optional(),
          slaDaysPerStep: z.number().int().min(1).max(90).optional(),
          idempotencyKey: z.string().uuid().optional(),
        })
        .refine(
          (i) =>
            (i.approvers !== undefined && i.approvers.length > 0) ||
            (i.approverUserId !== undefined && i.approverUserId.length > 0),
          { message: "Provide approverUserId or approvers.", path: ["approverUserId"] },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ENVIRONMENTAL_PERMIT_UPDATE,
      );
      const [existing] = await ctx.db
        .select()
        .from(environmentalRegulatoryPermit)
        .where(
          and(
            eq(environmentalRegulatoryPermit.id, input.permitId),
            eq(environmentalRegulatoryPermit.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Environmental permit not found." });
      }
      if (existing.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft permits can be submitted for activation approval.",
        });
      }

      const approverList = input.approvers?.length
        ? [...new Set(input.approvers)]
        : input.approverUserId
          ? [input.approverUserId]
          : [];
      if (approverList.length === 0 || approverList.length > 5) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Provide 1–5 distinct approvers." });
      }
      for (const uid of approverList) {
        await assertOrgMemberUserId(ctx.db, input.organizationId, uid);
      }

      const open = await ctx.db
        .select({ id: approvalRequest.id })
        .from(approvalRequest)
        .where(
          and(
            eq(approvalRequest.organizationId, input.organizationId),
            eq(approvalRequest.entityType, "environmental_regulatory_permit"),
            eq(approvalRequest.entityId, input.permitId),
            eq(approvalRequest.status, "open"),
          ),
        )
        .limit(1);
      if (open.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An open approval request already exists for this permit.",
        });
      }

      const { idempotencyKey, slaDaysPerStep, ...submitInput } = input;

      return ctx.db.transaction(async (tx) =>
        runWithMutationIdempotency(
          tx,
          {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            idempotencyKey,
            procedure: "environmental_regulatory_permit.submit_for_approval",
          },
          async () => {
            await insertEnvironmentalRegulatoryPermitApprovalRequestTx(tx, {
              organizationId: submitInput.organizationId,
              environmentalRegulatoryPermitId: submitInput.permitId,
              approverUserIds: approverList,
              actorUserId: ctx.user.id,
              slaDaysPerStep,
            });

            const now = new Date();
            const [upd] = await tx
              .update(environmentalRegulatoryPermit)
              .set({
                status: "pending_approval",
                updatedAt: now,
              })
              .where(eq(environmentalRegulatoryPermit.id, existing.id))
              .returning();

            await writeAuditLog(tx, {
              organizationId: submitInput.organizationId,
              actorUserId: ctx.user.id,
              action: "environmental_regulatory_permit.submit_approval",
              entityType: "environmental_regulatory_permit",
              entityId: existing.id,
              payload: { approverCount: approverList.length },
            });

            if (!upd) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Environmental permit submit did not return a row.",
              });
            }
            return upd;
          },
        ),
      );
    }),

  withdrawSubmission: protectedMutation
    .input(orgScope.extend({ permitId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ENVIRONMENTAL_PERMIT_UPDATE,
      );
      const [existing] = await ctx.db
        .select()
        .from(environmentalRegulatoryPermit)
        .where(
          and(
            eq(environmentalRegulatoryPermit.id, input.permitId),
            eq(environmentalRegulatoryPermit.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Environmental permit not found." });
      }
      if (existing.status !== "pending_approval") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only permits pending approval can withdraw submission.",
        });
      }
      const now = new Date();
      return ctx.db.transaction(async (tx) => {
        await tx
          .update(approvalRequest)
          .set({
            status: "cancelled",
            resolvedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(approvalRequest.organizationId, input.organizationId),
              eq(approvalRequest.entityType, "environmental_regulatory_permit"),
              eq(approvalRequest.entityId, existing.id),
              eq(approvalRequest.status, "open"),
            ),
          );

        const [upd] = await tx
          .update(environmentalRegulatoryPermit)
          .set({ status: "draft", updatedAt: now })
          .where(eq(environmentalRegulatoryPermit.id, existing.id))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "environmental_regulatory_permit.withdraw_submission",
          entityType: "environmental_regulatory_permit",
          entityId: existing.id,
          payload: {},
        });

        return upd;
      });
    }),

  update: protectedMutation
    .input(
      orgScope.extend({
        permitId: z.string().uuid(),
        title: z.string().min(2).max(512).optional(),
        permitIdentifier: z.string().min(1).max(256).optional(),
        agency: z.string().max(256).optional().nullable(),
        jurisdiction: z.string().max(256).optional().nullable(),
        media: z.enum(mediaValues).optional(),
        status: z.enum(statusValues).optional(),
        siteId: z.string().uuid().optional().nullable(),
        issuedAt: z.coerce.date().optional().nullable(),
        effectiveFrom: z.coerce.date().optional().nullable(),
        expiresAt: z.coerce.date().optional().nullable(),
        legalCitations: z.string().max(50_000).optional().nullable(),
        limits: limitsSchema.nullable(),
        complianceObligationId: z.string().uuid().optional().nullable(),
        ownerUserId: z.string().optional().nullable(),
        replaceConditions: z.array(conditionInput).max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ENVIRONMENTAL_PERMIT_UPDATE,
      );

      const [existing] = await ctx.db
        .select()
        .from(environmentalRegulatoryPermit)
        .where(
          and(
            eq(environmentalRegulatoryPermit.id, input.permitId),
            eq(environmentalRegulatoryPermit.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Environmental permit not found." });
      }

      if (existing.status === "pending_approval") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This permit is pending activation approval. Withdraw submission to edit, or wait for approvers.",
        });
      }

      if (input.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, input.siteId);
      }
      if (input.complianceObligationId) {
        const [o] = await ctx.db
          .select()
          .from(complianceObligation)
          .where(
            and(
              eq(complianceObligation.id, input.complianceObligationId),
              eq(complianceObligation.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!o) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Obligation not found." });
        }
      }
      if (input.ownerUserId) {
        await assertOrgMemberUserId(ctx.db, input.organizationId, input.ownerUserId);
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(environmentalRegulatoryPermit)
          .set({
            title: input.title !== undefined ? input.title.trim() : existing.title,
            permitIdentifier:
              input.permitIdentifier !== undefined
                ? input.permitIdentifier.trim()
                : existing.permitIdentifier,
            agency: input.agency !== undefined ? input.agency?.trim() ?? null : existing.agency,
            jurisdiction:
              input.jurisdiction !== undefined ? input.jurisdiction?.trim() ?? null : existing.jurisdiction,
            media: input.media !== undefined ? (input.media as (typeof environmentalRegulatoryPermitMediaEnum.enumValues)[number]) : existing.media,
            status: input.status !== undefined ? (input.status as (typeof environmentalRegulatoryPermitStatusEnum.enumValues)[number]) : existing.status,
            siteId: input.siteId !== undefined ? input.siteId : existing.siteId,
            issuedAt: input.issuedAt !== undefined ? input.issuedAt : existing.issuedAt,
            effectiveFrom:
              input.effectiveFrom !== undefined ? input.effectiveFrom : existing.effectiveFrom,
            expiresAt: input.expiresAt !== undefined ? input.expiresAt : existing.expiresAt,
            legalCitations:
              input.legalCitations !== undefined
                ? input.legalCitations?.trim() ?? null
                : existing.legalCitations,
            limits: input.limits !== undefined ? input.limits : existing.limits,
            complianceObligationId:
              input.complianceObligationId !== undefined
                ? input.complianceObligationId
                : existing.complianceObligationId,
            ownerUserId: input.ownerUserId !== undefined ? input.ownerUserId : existing.ownerUserId,
            updatedAt: new Date(),
          })
          .where(eq(environmentalRegulatoryPermit.id, input.permitId))
          .returning();

        if (input.replaceConditions !== undefined) {
          await tx
            .delete(environmentalRegulatoryPermitCondition)
            .where(eq(environmentalRegulatoryPermitCondition.permitId, input.permitId));
          if (input.replaceConditions.length > 0) {
            await tx.insert(environmentalRegulatoryPermitCondition).values(
              input.replaceConditions.map((c, i) => ({
                permitId: input.permitId,
                sortOrder: c.sortOrder ?? i,
                conditionText: c.conditionText.trim(),
                referenceCode: c.referenceCode?.trim() ?? null,
              })),
            );
          }
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "environmental_regulatory_permit.update",
          entityType: "environmental_regulatory_permit",
          entityId: input.permitId,
          payload: {},
        });

        return row;
      });
    }),

  setProgramRetention: protectedMutation
    .input(
      orgScope
        .extend({
          permitId: z.string().uuid(),
          retainUntil: z.coerce.date().nullable().optional(),
          legalHold: z.boolean().optional(),
        })
        .refine((i) => i.retainUntil !== undefined || i.legalHold !== undefined, {
          message: "Provide retainUntil and/or legalHold.",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ENVIRONMENTAL_PERMIT_READ,
      );
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.RETENTION_POLICY_WRITE,
      );
      const [existing] = await ctx.db
        .select()
        .from(environmentalRegulatoryPermit)
        .where(
          and(
            eq(environmentalRegulatoryPermit.id, input.permitId),
            eq(environmentalRegulatoryPermit.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Environmental permit not found." });
      }

      return ctx.db.transaction(async (tx) => {
        const [upd] = await tx
          .update(environmentalRegulatoryPermit)
          .set({
            retainUntil:
              input.retainUntil !== undefined ? (input.retainUntil ?? null) : existing.retainUntil,
            legalHold: input.legalHold !== undefined ? input.legalHold : existing.legalHold,
            updatedAt: new Date(),
          })
          .where(eq(environmentalRegulatoryPermit.id, existing.id))
          .returning();
        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "environmental_regulatory_permit.set_program_retention",
          entityType: "environmental_regulatory_permit",
          entityId: existing.id,
          payload: {
            retainUntil:
              input.retainUntil !== undefined ? (input.retainUntil?.toISOString() ?? null) : undefined,
            legalHold: input.legalHold,
          },
        });
        return upd;
      });
    }),
});
