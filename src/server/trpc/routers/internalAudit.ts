import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  auditFinding,
  auditFindingTypeEnum,
  correctiveAction,
  internalAudit,
  internalAuditStatusEnum,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { assertOrgMemberUserId } from "../assertOrgScoped";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

const auditStatuses = internalAuditStatusEnum.enumValues as [string, ...string[]];
const findingTypes = auditFindingTypeEnum.enumValues as [string, ...string[]];

async function getAuditInOrg(
  db: import("@/server/db").Db,
  organizationId: string,
  internalAuditId: string,
) {
  const [row] = await db
    .select()
    .from(internalAudit)
    .where(
      and(
        eq(internalAudit.id, internalAuditId),
        eq(internalAudit.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row;
}

const findingRouter = router({
  list: protectedProcedure
    .input(orgScope.extend({ internalAuditId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.FINDING_READ,
      );

      const audit = await getAuditInOrg(
        ctx.db,
        input.organizationId,
        input.internalAuditId,
      );
      if (!audit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found." });
      }

      return ctx.db
        .select()
        .from(auditFinding)
        .where(
          and(
            eq(auditFinding.internalAuditId, input.internalAuditId),
            eq(auditFinding.organizationId, input.organizationId),
          ),
        )
        .orderBy(desc(auditFinding.createdAt));
    }),

  create: protectedMutation
    .input(
      orgScope.extend({
        internalAuditId: z.string().uuid(),
        findingType: z.enum(findingTypes),
        title: z.string().min(2).max(512),
        details: z.string().max(50_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.FINDING_CREATE,
      );

      if (input.findingType === "major_nc") {
        await assertPermission(
          ctx.db,
          ctx.user.id,
          input.organizationId,
          PERMISSIONS.CAPA_CREATE,
        );
      }

      const audit = await getAuditInOrg(
        ctx.db,
        input.organizationId,
        input.internalAuditId,
      );
      if (!audit) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found." });
      }

      return ctx.db.transaction(async (tx) => {
        let correctiveActionId: string | null = null;
        if (input.findingType === "major_nc") {
          const [capa] = await tx
            .insert(correctiveAction)
            .values({
              organizationId: input.organizationId,
              incidentId: null,
              title: `CAPA (pending approval): ${input.title}`,
              details: input.details ?? null,
              status: "pending_approval",
              ownerUserId: null,
            })
            .returning();
          correctiveActionId = capa?.id ?? null;
        }

        const [row] = await tx
          .insert(auditFinding)
          .values({
            organizationId: input.organizationId,
            internalAuditId: input.internalAuditId,
            findingType: input.findingType as (typeof auditFindingTypeEnum.enumValues)[number],
            title: input.title,
            details: input.details ?? null,
            correctiveActionId,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create audit finding.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "internal_audit.finding.create",
          entityType: "audit_finding",
          entityId: row.id,
          payload: {
            internalAuditId: input.internalAuditId,
            findingType: input.findingType,
            draftCapa: correctiveActionId !== null,
            correctiveActionId,
          },
        });

        if (correctiveActionId) {
          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "capa.create_from_audit_finding",
            entityType: "corrective_action",
            entityId: correctiveActionId,
            payload: { auditFindingId: row.id },
          });
        }

        return row;
      });
    }),
});

export const internalAuditRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.AUDIT_READ,
    );

    return ctx.db
      .select()
      .from(internalAudit)
      .where(eq(internalAudit.organizationId, input.organizationId))
      .orderBy(
        desc(internalAudit.plannedDate),
        desc(internalAudit.createdAt),
      );
  }),

  create: protectedMutation
    .input(
      orgScope.extend({
        title: z.string().min(2).max(512),
        scope: z.string().min(10).max(50_000),
        status: z.enum(auditStatuses).optional(),
        plannedDate: z.coerce.date().optional(),
        leadAuditorUserId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.AUDIT_CREATE,
      );

      if (input.leadAuditorUserId) {
        await assertOrgMemberUserId(
          ctx.db,
          input.organizationId,
          input.leadAuditorUserId,
        );
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(internalAudit)
          .values({
            organizationId: input.organizationId,
            title: input.title,
            scope: input.scope,
            status:
              (input.status as (typeof internalAuditStatusEnum.enumValues)[number]) ??
              "planned",
            plannedDate: input.plannedDate ?? null,
            leadAuditorUserId: input.leadAuditorUserId ?? null,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create internal audit.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "internal_audit.create",
          entityType: "internal_audit",
          entityId: row.id,
          payload: { title: input.title },
        });

        return row;
      });
    }),

  update: protectedMutation
    .input(
      orgScope.extend({
        auditId: z.string().uuid(),
        title: z.string().min(2).max(512).optional(),
        scope: z.string().min(10).max(50_000).optional(),
        status: z.enum(auditStatuses).optional(),
        plannedDate: z.coerce.date().optional().nullable(),
        completedAt: z.coerce.date().optional().nullable(),
        leadAuditorUserId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.AUDIT_UPDATE,
      );

      const existing = await getAuditInOrg(
        ctx.db,
        input.organizationId,
        input.auditId,
      );
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found." });
      }

      if (input.leadAuditorUserId) {
        await assertOrgMemberUserId(
          ctx.db,
          input.organizationId,
          input.leadAuditorUserId,
        );
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(internalAudit)
          .set({
            title: input.title ?? existing.title,
            scope: input.scope ?? existing.scope,
            status:
              (input.status as (typeof internalAuditStatusEnum.enumValues)[number] | undefined) ??
              existing.status,
            plannedDate:
              input.plannedDate !== undefined ? input.plannedDate : existing.plannedDate,
            completedAt:
              input.completedAt !== undefined
                ? input.completedAt
                : existing.completedAt,
            leadAuditorUserId:
              input.leadAuditorUserId !== undefined
                ? input.leadAuditorUserId
                : existing.leadAuditorUserId,
            updatedAt: new Date(),
          })
          .where(eq(internalAudit.id, input.auditId))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "internal_audit.update",
          entityType: "internal_audit",
          entityId: input.auditId,
          payload: {},
        });

        return row;
      });
    }),

  finding: findingRouter,
});
