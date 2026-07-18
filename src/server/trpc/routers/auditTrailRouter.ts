import { and, desc, eq, gte, lte, lt, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { auditTrailRowsToCsv } from "@/lib/analytics/auditTrailCsv";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { auditLog, authUser } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { orgScope } from "../schemas/orgScope";
import { protectedProcedure, protectedRateLimitedProcedure, router } from "../init";

const auditTrailFilterFields = {
  entityType: z.string().min(1).max(128).optional(),
  action: z.string().min(1).max(128).optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
  actorUserId: z.string().min(1).optional(),
} as const;

const listInputSchema = orgScope.extend({
  limit: z.number().int().min(1).max(100).optional().default(50),
  cursor: z
    .object({
      createdAt: z.string(),
      id: z.string().uuid(),
    })
    .optional(),
  ...auditTrailFilterFields,
});

const exportCsvInputSchema = orgScope.extend({
  limit: z.number().int().min(1).max(5000).optional().default(2000),
  ...auditTrailFilterFields,
});

type ListCursor = { createdAt: string; id: string };

type AuditTrailFilterable = {
  organizationId: string;
  entityType?: string | undefined;
  action?: string | undefined;
  createdAfter?: Date | undefined;
  createdBefore?: Date | undefined;
  actorUserId?: string | undefined;
};

function parseCursorDate(iso: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "cursor.createdAt must be a valid ISO date string.",
    });
  }
  return d;
}

function auditTrailFilterConditions(input: AuditTrailFilterable, cursor?: ListCursor): SQL[] {
  const conditions: SQL[] = [eq(auditLog.organizationId, input.organizationId)];

  if (input.entityType) {
    conditions.push(eq(auditLog.entityType, input.entityType));
  }
  if (input.action) {
    conditions.push(eq(auditLog.action, input.action));
  }
  if (input.createdAfter) {
    conditions.push(gte(auditLog.createdAt, input.createdAfter));
  }
  if (input.createdBefore) {
    conditions.push(lte(auditLog.createdAt, input.createdBefore));
  }
  if (input.actorUserId) {
    conditions.push(eq(auditLog.actorUserId, input.actorUserId));
  }
  if (cursor) {
    const cAt = parseCursorDate(cursor.createdAt);
    conditions.push(
      or(
        lt(auditLog.createdAt, cAt),
        and(eq(auditLog.createdAt, cAt), lt(auditLog.id, cursor.id)),
      )!,
    );
  }
  return conditions;
}

export const auditTrailRouter = router({
  /**
   * Read-only chronological system audit rows for an org (`audit_log` + optional actor identity).
   * Keyset pagination: pass `cursor` from the prior page's `nextCursor`.
   */
  list: protectedProcedure.input(listInputSchema).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.AUDIT_TRAIL_READ,
    );

    const limit = input.limit ?? 50;
    const fetchCount = Math.min(limit + 1, 101);

    const conditions = auditTrailFilterConditions(input, input.cursor);

    const rows = await ctx.db
      .select({
        id: auditLog.id,
        organizationId: auditLog.organizationId,
        actorUserId: auditLog.actorUserId,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        payload: auditLog.payload,
        createdAt: auditLog.createdAt,
        actorName: authUser.name,
        actorEmail: authUser.email,
      })
      .from(auditLog)
      .leftJoin(authUser, eq(auditLog.actorUserId, authUser.id))
      .where(and(...conditions))
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(fetchCount);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const last = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && last
        ? { createdAt: last.createdAt.toISOString(), id: last.id }
        : null;

    return {
      items: pageRows.map((r) => ({
        id: r.id,
        organizationId: r.organizationId,
        actorUserId: r.actorUserId,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        payload: r.payload ?? null,
        createdAt: r.createdAt.toISOString(),
        actorName: r.actorName ?? null,
        actorEmail: r.actorEmail ?? null,
      })),
      nextCursor,
    };
  }),

  /**
   * Auditor / diligence CSV: newest rows first, same filter shape as `list` (no cursor). Max **5000** rows.
   * Permission: `audit_trail:read`. Writes `audit_log` (`compliance.audit_trail.export_csv`).
   */
  exportCsv: protectedRateLimitedProcedure.input(exportCsvInputSchema).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.AUDIT_TRAIL_READ,
    );

    const limit = input.limit ?? 2000;
    const conditions = auditTrailFilterConditions(input);

    const rows = await ctx.db
      .select({
        id: auditLog.id,
        organizationId: auditLog.organizationId,
        actorUserId: auditLog.actorUserId,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        payload: auditLog.payload,
        createdAt: auditLog.createdAt,
        actorName: authUser.name,
        actorEmail: authUser.email,
      })
      .from(auditLog)
      .leftJoin(authUser, eq(auditLog.actorUserId, authUser.id))
      .where(and(...conditions))
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(limit);

    const csv = auditTrailRowsToCsv(
      rows.map((r) => ({
        id: r.id,
        organizationId: r.organizationId ?? "",
        createdAtIso: r.createdAt.toISOString(),
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        actorUserId: r.actorUserId,
        actorName: r.actorName ?? null,
        actorEmail: r.actorEmail ?? null,
        payloadJson: r.payload ? JSON.stringify(r.payload) : "",
      })),
    );

    await writeAuditLog(ctx.db, {
      organizationId: input.organizationId,
      actorUserId: ctx.user.id,
      action: "compliance.audit_trail.export_csv",
      entityType: "organization",
      entityId: input.organizationId,
      payload: {
        rowCount: rows.length,
        limit,
        filters: {
          entityType: input.entityType ?? null,
          action: input.action ?? null,
          createdAfter: input.createdAfter ? input.createdAfter.toISOString() : null,
          createdBefore: input.createdBefore ? input.createdBefore.toISOString() : null,
          actorUserId: input.actorUserId ?? null,
        },
      },
    });

    return {
      rowCount: rows.length,
      limit,
      csv,
    };
  }),
});
