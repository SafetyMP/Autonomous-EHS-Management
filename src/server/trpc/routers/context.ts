import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Db } from "@/server/db";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  contextIssue,
  contextIssueKindEnum,
  interestedParty,
  managementSystemScope,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

const issueKinds = contextIssueKindEnum.enumValues as [string, ...string[]];

type DbLikeInsert = Pick<Db, "insert">;

async function insertScopeWithAudit(
  tx: DbLikeInsert,
  params: {
    organizationId: string;
    statement: string;
    coveredSiteIds: string[];
    actorUserId: string;
  },
) {
  const [row] = await tx
    .insert(managementSystemScope)
    .values({
      organizationId: params.organizationId,
      statement: params.statement,
      coveredSiteIds: params.coveredSiteIds,
    })
    .returning();

  if (!row) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create scope.",
    });
  }

  await writeAuditLog(tx, {
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    action: "context.scope.create",
    entityType: "management_system_scope",
    entityId: row.id,
    payload: {},
  });

  return row;
}

export const contextRouter = router({
  listScopes: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.CONTEXT_READ,
    );

    return ctx.db
      .select()
      .from(managementSystemScope)
      .where(eq(managementSystemScope.organizationId, input.organizationId))
      .orderBy(desc(managementSystemScope.updatedAt));
  }),

  createScope: protectedMutation
    .input(
      orgScope.extend({
        statement: z.string().min(10).max(50_000),
        coveredSiteIds: z.array(z.string().uuid()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CONTEXT_WRITE,
      );

      return ctx.db.transaction(async (tx) =>
        insertScopeWithAudit(tx, {
          organizationId: input.organizationId,
          statement: input.statement,
          coveredSiteIds: input.coveredSiteIds ?? [],
          actorUserId: ctx.user.id,
        }),
      );
    }),

  upsertScope: protectedMutation
    .input(
      orgScope.extend({
        scopeId: z.string().uuid().optional(),
        statement: z.string().min(10).max(50_000),
        coveredSiteIds: z.array(z.string().uuid()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CONTEXT_WRITE,
      );

      return ctx.db.transaction(async (tx) => {
        if (input.scopeId) {
          const [existing] = await tx
            .select()
            .from(managementSystemScope)
            .where(
              and(
                eq(managementSystemScope.id, input.scopeId),
                eq(managementSystemScope.organizationId, input.organizationId),
              ),
            )
            .limit(1);

          if (!existing) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Scope not found." });
          }

          const [row] = await tx
            .update(managementSystemScope)
            .set({
              statement: input.statement,
              coveredSiteIds: input.coveredSiteIds,
              updatedAt: new Date(),
            })
            .where(eq(managementSystemScope.id, input.scopeId))
            .returning();

          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "context.scope.update",
            entityType: "management_system_scope",
            entityId: input.scopeId,
            payload: {},
          });

          return row;
        }

        return insertScopeWithAudit(tx, {
          organizationId: input.organizationId,
          statement: input.statement,
          coveredSiteIds: input.coveredSiteIds,
          actorUserId: ctx.user.id,
        });
      });
    }),

  listIssues: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.CONTEXT_READ,
    );

    return ctx.db
      .select()
      .from(contextIssue)
      .where(eq(contextIssue.organizationId, input.organizationId))
      .orderBy(desc(contextIssue.updatedAt));
  }),

  createIssue: protectedMutation
    .input(
      orgScope.extend({
        kind: z.enum(issueKinds),
        category: z.string().min(1).max(128),
        description: z.string().min(1).max(50_000),
        reviewDue: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CONTEXT_WRITE,
      );

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(contextIssue)
          .values({
            organizationId: input.organizationId,
            kind: input.kind as (typeof contextIssueKindEnum.enumValues)[number],
            category: input.category,
            description: input.description,
            reviewDue: input.reviewDue ?? null,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create context issue.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "context.issue.create",
          entityType: "context_issue",
          entityId: row.id,
          payload: { category: input.category },
        });

        return row;
      });
    }),

  updateIssue: protectedMutation
    .input(
      orgScope.extend({
        issueId: z.string().uuid(),
        category: z.string().min(1).max(128).optional(),
        description: z.string().min(1).max(50_000).optional(),
        reviewDue: z.coerce.date().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CONTEXT_WRITE,
      );

      const [existing] = await ctx.db
        .select()
        .from(contextIssue)
        .where(
          and(
            eq(contextIssue.id, input.issueId),
            eq(contextIssue.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Context issue not found." });
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(contextIssue)
          .set({
            category: input.category ?? existing.category,
            description: input.description ?? existing.description,
            reviewDue: input.reviewDue !== undefined ? input.reviewDue : existing.reviewDue,
            updatedAt: new Date(),
          })
          .where(eq(contextIssue.id, input.issueId))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "context.issue.update",
          entityType: "context_issue",
          entityId: input.issueId,
          payload: {},
        });

        return row;
      });
    }),

  listParties: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.CONTEXT_READ,
    );

    return ctx.db
      .select()
      .from(interestedParty)
      .where(eq(interestedParty.organizationId, input.organizationId))
      .orderBy(desc(interestedParty.updatedAt));
  }),

  createParty: protectedMutation
    .input(
      orgScope.extend({
        name: z.string().min(2).max(512),
        requirementsExpectations: z.string().max(50_000).optional(),
        influenceNotes: z.string().max(50_000).optional(),
        reviewDue: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CONTEXT_WRITE,
      );

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(interestedParty)
          .values({
            organizationId: input.organizationId,
            name: input.name,
            requirementsExpectations: input.requirementsExpectations ?? null,
            influenceNotes: input.influenceNotes ?? null,
            reviewDue: input.reviewDue ?? null,
          })
          .returning();

        if (!row) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create interested party.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "context.party.create",
          entityType: "interested_party",
          entityId: row.id,
          payload: { name: input.name },
        });

        return row;
      });
    }),

  updateParty: protectedMutation
    .input(
      orgScope.extend({
        partyId: z.string().uuid(),
        name: z.string().min(2).max(512).optional(),
        requirementsExpectations: z.string().max(50_000).optional().nullable(),
        influenceNotes: z.string().max(50_000).optional().nullable(),
        reviewDue: z.coerce.date().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.CONTEXT_WRITE,
      );

      const [existing] = await ctx.db
        .select()
        .from(interestedParty)
        .where(
          and(
            eq(interestedParty.id, input.partyId),
            eq(interestedParty.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Interested party not found." });
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(interestedParty)
          .set({
            name: input.name ?? existing.name,
            requirementsExpectations:
              input.requirementsExpectations !== undefined
                ? input.requirementsExpectations
                : existing.requirementsExpectations,
            influenceNotes:
              input.influenceNotes !== undefined
                ? input.influenceNotes
                : existing.influenceNotes,
            reviewDue: input.reviewDue !== undefined ? input.reviewDue : existing.reviewDue,
            updatedAt: new Date(),
          })
          .where(eq(interestedParty.id, input.partyId))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "context.party.update",
          entityType: "interested_party",
          entityId: input.partyId,
          payload: {},
        });

        return row;
      });
    }),
});
