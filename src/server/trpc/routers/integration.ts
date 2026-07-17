import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { env } from "@/lib/env";
import { INTEGRATION_CONNECTOR_KEYS } from "@/lib/integration/connectorKeys";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { integrationConnectorMapping, integrationEvent } from "@/server/db/schema";
import { getJobQueue } from "@/server/jobs/queue";
import { JOB_NAMES } from "@/server/jobs/types";
import { reprocessFailedIntegrationEvent } from "@/server/services/integrationInboundDispatch";
import { writeAuditLog } from "@/server/services/audit";
import { persistTrainingCompletionEvent } from "@/server/services/trainingCompletionIngest";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

const connectorKeyZ = z.enum(INTEGRATION_CONNECTOR_KEYS);

export const integrationRouter = router({
  listEvents: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.INTEGRATION_READ);
    return ctx.db
      .select()
      .from(integrationEvent)
      .where(eq(integrationEvent.organizationId, input.organizationId))
      .orderBy(desc(integrationEvent.createdAt))
      .limit(100);
  }),

  /**
   * Compact failed-event backlog for operators (`integration:read`).
   * Pair retrys with `integration.reprocessFailedEvent` (`integration:write`, optionally via pg-boss).
   */
  failedEventsHealth: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.INTEGRATION_READ);
    const failedWhere = and(
      eq(integrationEvent.organizationId, input.organizationId),
      eq(integrationEvent.processingStatus, "failed"),
    );

    const [[countRow], recent, oldestRows] = await Promise.all([
      ctx.db.select({ n: count() }).from(integrationEvent).where(failedWhere),
      ctx.db
        .select({
          id: integrationEvent.id,
          eventType: integrationEvent.eventType,
          createdAt: integrationEvent.createdAt,
          processingError: integrationEvent.processingError,
        })
        .from(integrationEvent)
        .where(failedWhere)
        .orderBy(desc(integrationEvent.createdAt))
        .limit(8),
      ctx.db
        .select({ createdAt: integrationEvent.createdAt })
        .from(integrationEvent)
        .where(failedWhere)
        .orderBy(asc(integrationEvent.createdAt))
        .limit(1),
    ]);

    const oldest = oldestRows[0];
    return {
      failedCount: Number(countRow?.n ?? 0),
      oldestFailedCreatedAt: oldest?.createdAt ? oldest.createdAt.toISOString() : null,
      recentFailed: recent.map((r) => ({
        id: r.id,
        eventType: r.eventType,
        createdAt: r.createdAt.toISOString(),
        processingError: r.processingError,
      })),
    };
  }),

  /**
   * Newline-delimited JSON slice of `integration_event` for warehouse / lake ingest.
   * Permission: `integration:read`. Writes `audit_log` (`integration.export_events_warehouse`).
   */
  exportEventsWarehouseSlice: protectedProcedure
    .input(
      orgScope.extend({
        limit: z.number().int().min(1).max(5000).optional().default(500),
        since: z.coerce.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.INTEGRATION_READ);

      const whereClause = input.since
        ? and(
            eq(integrationEvent.organizationId, input.organizationId),
            gte(integrationEvent.createdAt, input.since),
          )
        : eq(integrationEvent.organizationId, input.organizationId);

      const rows = await ctx.db
        .select()
        .from(integrationEvent)
        .where(whereClause)
        .orderBy(desc(integrationEvent.createdAt))
        .limit(input.limit);

      const ndjson = rows
        .map((r) =>
          JSON.stringify({
            id: r.id,
            organizationId: r.organizationId,
            eventType: r.eventType,
            payload: r.payload,
            deliveredAt: r.deliveredAt,
            processingStatus: r.processingStatus,
            processingError: r.processingError,
            appliedAt: r.appliedAt,
            createdAt: r.createdAt,
          }),
        )
        .join("\n");

      await writeAuditLog(ctx.db, {
        organizationId: input.organizationId,
        actorUserId: ctx.user.id,
        action: "integration.export_events_warehouse",
        entityType: "organization",
        entityId: input.organizationId,
        payload: {
          rowCount: rows.length,
          limit: input.limit,
          since: input.since ? input.since.toISOString() : null,
        },
      });

      return {
        rowCount: rows.length,
        body: ndjson,
      };
    }),

  enqueueTestEvent: protectedMutation
    .input(orgScope.extend({ eventType: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.INTEGRATION_WRITE);
      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(integrationEvent)
          .values({
            organizationId: input.organizationId,
            eventType: input.eventType,
            payload: { source: "manual_test", at: new Date().toISOString() },
            processingStatus: "applied",
            appliedAt: new Date(),
          })
          .returning();
        if (row) {
          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "integration.enqueue",
            entityType: "integration_event",
            entityId: row.id,
          });
        }
        return row;
      });
    }),

  ingestTrainingCompletion: protectedMutation
    .input(
      z.object({
        organizationId: z.string().uuid(),
        externalWorkerId: z.string().min(1).max(256),
        courseCode: z.string().min(1).max(128),
        completedAt: z.coerce.date(),
        issuer: z.string().min(1).max(128),
        idempotencyKey: z.string().min(1).max(256).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INTEGRATION_WRITE,
      );
      return persistTrainingCompletionEvent(ctx.db, input, ctx.user.id);
    }),

  /** Tenant LMS/HRIS field-mapping hints (consult `docs/integration-connector-mapping.md`). */
  listConnectorMappings: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.INTEGRATION_READ);

    const rows = await ctx.db
      .select({
        id: integrationConnectorMapping.id,
        connectorKey: integrationConnectorMapping.connectorKey,
        mappingJson: integrationConnectorMapping.mappingJson,
        schemaVersion: integrationConnectorMapping.schemaVersion,
        updatedAt: integrationConnectorMapping.updatedAt,
      })
      .from(integrationConnectorMapping)
      .where(eq(integrationConnectorMapping.organizationId, input.organizationId))
      .orderBy(integrationConnectorMapping.connectorKey);

    return rows;
  }),

  upsertConnectorMapping: protectedMutation
    .input(
      orgScope.extend({
        connectorKey: connectorKeyZ,
        mappingJson: z
          .record(z.string(), z.unknown())
          .refine((r) => Object.keys(r).length <= 96, {
            message: "Mapping may include at most 96 keys.",
          }),
        schemaVersion: z.number().int().min(1).max(999).optional().default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INTEGRATION_WRITE,
      );

      const now = new Date();
      const [row] = await ctx.db
        .insert(integrationConnectorMapping)
        .values({
          organizationId: input.organizationId,
          connectorKey: input.connectorKey,
          mappingJson: input.mappingJson,
          schemaVersion: input.schemaVersion,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            integrationConnectorMapping.organizationId,
            integrationConnectorMapping.connectorKey,
          ],
          set: {
            mappingJson: input.mappingJson,
            schemaVersion: input.schemaVersion,
            updatedAt: now,
          },
        })
        .returning({
          id: integrationConnectorMapping.id,
          connectorKey: integrationConnectorMapping.connectorKey,
        });

      await writeAuditLog(ctx.db, {
        organizationId: input.organizationId,
        actorUserId: ctx.user.id,
        action: "integration.connector_mapping.upsert",
        entityType: "integration_connector_mapping",
        entityId: row?.id ?? input.organizationId,
        payload: { connectorKey: input.connectorKey },
      });

      return { ok: true as const, mappingId: row?.id ?? null };
    }),

  reprocessFailedEvent: protectedMutation
    .input(
      z.object({
        organizationId: z.string().uuid(),
        eventId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INTEGRATION_WRITE,
      );
      if (env.PG_BOSS_ENABLED === "true") {
        await getJobQueue().enqueue(JOB_NAMES.INTEGRATION_REPROCESS_FAILED, {
          organizationId: input.organizationId,
          eventId: input.eventId,
          actorUserId: ctx.user.id,
        });
        await writeAuditLog(ctx.db, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "integration.reprocess_queued",
          entityType: "integration_event",
          entityId: input.eventId,
        });
        return { ok: true as const, queued: true as const };
      }
      const result = await reprocessFailedIntegrationEvent(ctx.db, {
        organizationId: input.organizationId,
        eventId: input.eventId,
        actorUserId: ctx.user.id,
      });
      if (!result.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.message });
      }
      return { ok: true as const, queued: false as const };
    }),

  reprocessAllFailedEvents: protectedMutation
    .input(
      orgScope.extend({
        limit: z.number().int().min(1).max(25).optional().default(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INTEGRATION_WRITE,
      );

      const failed = await ctx.db
        .select({ id: integrationEvent.id })
        .from(integrationEvent)
        .where(
          and(
            eq(integrationEvent.organizationId, input.organizationId),
            eq(integrationEvent.processingStatus, "failed"),
          ),
        )
        .orderBy(desc(integrationEvent.createdAt))
        .limit(input.limit);

      if (failed.length === 0) {
        return { ok: true as const, attempted: 0, queued: 0, succeeded: 0 };
      }

      let queued = 0;
      let succeeded = 0;

      for (const row of failed) {
        if (env.PG_BOSS_ENABLED === "true") {
          await getJobQueue().enqueue(JOB_NAMES.INTEGRATION_REPROCESS_FAILED, {
            organizationId: input.organizationId,
            eventId: row.id,
            actorUserId: ctx.user.id,
          });
          queued += 1;
        } else {
          const result = await reprocessFailedIntegrationEvent(ctx.db, {
            organizationId: input.organizationId,
            eventId: row.id,
            actorUserId: ctx.user.id,
          });
          if (result.ok) succeeded += 1;
        }
      }

      await writeAuditLog(ctx.db, {
        organizationId: input.organizationId,
        actorUserId: ctx.user.id,
        action: "integration.reprocess_all_failed",
        entityType: "organization",
        entityId: input.organizationId,
        payload: { attempted: failed.length, queued, succeeded },
      });

      return {
        ok: true as const,
        attempted: failed.length,
        queued,
        succeeded,
      };
    }),

  rosterDriftSummary: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.INTEGRATION_READ);
    const { getLatestRosterDriftSummary } = await import("@/server/services/rosterReconciliation");
    const summary = await getLatestRosterDriftSummary(ctx.db, input.organizationId);
    return {
      driftCount: summary.driftCount,
      capturedAt: summary.capturedAt?.toISOString() ?? null,
      snapshotId: summary.snapshotId,
    };
  }),

  enqueueRosterReconcile: protectedMutation.input(orgScope).mutation(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.INTEGRATION_WRITE);
    const queued = env.PG_BOSS_ENABLED === "true";
    await writeAuditLog(ctx.db, {
      organizationId: input.organizationId,
      actorUserId: ctx.user.id,
      action: "integration.roster_reconcile.requested",
      entityType: "organization",
      entityId: input.organizationId,
      payload: { queued },
    });
    if (queued) {
      await getJobQueue().enqueue(JOB_NAMES.INTEGRATION_RECONCILE_ROSTER, {
        organizationId: input.organizationId,
      });
      return { ok: true as const, queued: true as const };
    }
    const { reconcileRosterForOrg } = await import("@/server/services/rosterReconciliation");
    const result = await reconcileRosterForOrg(ctx.db, input.organizationId);
    return { ok: true as const, queued: false as const, ...result };
  }),
});
