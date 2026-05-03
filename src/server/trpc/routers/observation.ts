import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  correctiveAction,
  escalationEvent,
  safetyObservation,
  safetyObservationCategoryEnum,
  safetyObservationSeverityEnum,
  safetyObservationStatusEnum,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { runWithMutationIdempotency } from "@/server/services/mutationIdempotency";
import { computeDefaultRetainUntilForProgramRecord } from "@/server/services/incidentRetentionDefault";
import { assertOrgMemberUserId, assertSiteInOrg } from "../assertOrgScoped";
import { protectedMutation, protectedProcedure, router } from "../init";
import { orgScope } from "../schemas/orgScope";

type ObsCategory = (typeof safetyObservationCategoryEnum.enumValues)[number];
type ObsSeverity = (typeof safetyObservationSeverityEnum.enumValues)[number];
type ObsStatus = (typeof safetyObservationStatusEnum.enumValues)[number];

const categories = safetyObservationCategoryEnum.enumValues as [ObsCategory, ...ObsCategory[]];
const severities = safetyObservationSeverityEnum.enumValues as [ObsSeverity, ...ObsSeverity[]];
const obsStatuses = safetyObservationStatusEnum.enumValues as [ObsStatus, ...ObsStatus[]];

export const observationRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.SAFETY_OBSERVATION_READ);
    return ctx.db
      .select()
      .from(safetyObservation)
      .where(eq(safetyObservation.organizationId, input.organizationId))
      .orderBy(desc(safetyObservation.observedAt), desc(safetyObservation.createdAt));
  }),

  listEscalations: protectedProcedure
    .input(orgScope.extend({ observationId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.SAFETY_OBSERVATION_READ);

      if (input.observationId) {
        const [obs] = await ctx.db
          .select({ id: safetyObservation.id })
          .from(safetyObservation)
          .where(
            and(
              eq(safetyObservation.id, input.observationId),
              eq(safetyObservation.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!obs) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Observation not found." });
        }
      }

      const conditions = [
        eq(escalationEvent.organizationId, input.organizationId),
        eq(escalationEvent.entityType, "safety_observation"),
      ];
      if (input.observationId) {
        conditions.push(eq(escalationEvent.entityId, input.observationId));
      }

      return ctx.db
        .select()
        .from(escalationEvent)
        .where(and(...conditions))
        .orderBy(desc(escalationEvent.detectedAt))
        .limit(50);
    }),

  get: protectedProcedure
    .input(orgScope.extend({ observationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.SAFETY_OBSERVATION_READ);
      const [row] = await ctx.db
        .select()
        .from(safetyObservation)
        .where(
          and(
            eq(safetyObservation.id, input.observationId),
            eq(safetyObservation.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Observation not found." });
      }
      return row;
    }),

  create: protectedMutation
    .input(
      orgScope.extend({
        summary: z.string().min(2).max(512),
        details: z.string().max(50_000).optional().nullable(),
        category: z.enum(categories).optional(),
        severity: z.enum(severities).optional(),
        observedAt: z.coerce.date().optional(),
        siteId: z.string().uuid().optional().nullable(),
        idempotencyKey: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.SAFETY_OBSERVATION_CREATE);

      if (input.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, input.siteId);
      }

      const observedDate = input.observedAt ?? new Date();
      const retainUntilDefault = await computeDefaultRetainUntilForProgramRecord(
        ctx.db,
        input.organizationId,
        observedDate,
        "safety_observation_program",
      );

      const { idempotencyKey, ...obsInput } = input;

      return ctx.db.transaction(async (tx) =>
        runWithMutationIdempotency(
          tx,
          {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            idempotencyKey,
            procedure: "safety_observation.create",
          },
          async () => {
            const [row] = await tx
              .insert(safetyObservation)
              .values({
                organizationId: obsInput.organizationId,
                siteId: obsInput.siteId ?? null,
                summary: obsInput.summary.trim(),
                details: obsInput.details?.trim() ?? null,
                category: obsInput.category ?? "other",
                severity: obsInput.severity ?? "medium",
                observedAt: observedDate,
                reporterUserId: ctx.user.id,
                status: "open",
                retainUntil: retainUntilDefault,
              })
              .returning();

            if (!row) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to create observation.",
              });
            }

            await writeAuditLog(tx, {
              organizationId: obsInput.organizationId,
              actorUserId: ctx.user.id,
              action: "safety_observation.create",
              entityType: "safety_observation",
              entityId: row.id,
              payload: { summary: row.summary },
            });

            return row;
          },
        ),
      );
    }),

  update: protectedMutation
    .input(
      orgScope.extend({
        observationId: z.string().uuid(),
        summary: z.string().min(2).max(512).optional(),
        details: z.string().max(50_000).optional().nullable(),
        category: z.enum(categories).optional(),
        severity: z.enum(severities).optional(),
        status: z.enum(obsStatuses).optional(),
        observedAt: z.coerce.date().optional(),
        siteId: z.string().uuid().optional().nullable(),
        assigneeUserId: z.string().min(1).optional().nullable(),
        followUpDueAt: z.coerce.date().optional().nullable(),
        retainUntil: z.coerce.date().nullable().optional(),
        legalHold: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.SAFETY_OBSERVATION_UPDATE);
      const touchesRetention = input.retainUntil !== undefined || input.legalHold !== undefined;
      if (touchesRetention) {
        await assertPermission(
          ctx.db,
          ctx.user.id,
          input.organizationId,
          PERMISSIONS.RETENTION_POLICY_WRITE,
        );
      }

      const [existing] = await ctx.db
        .select()
        .from(safetyObservation)
        .where(
          and(
            eq(safetyObservation.id, input.observationId),
            eq(safetyObservation.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Observation not found." });
      }

      if (input.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, input.siteId);
      }

      if (input.assigneeUserId !== undefined && input.assigneeUserId !== null) {
        await assertOrgMemberUserId(ctx.db, input.organizationId, input.assigneeUserId);
      }

      const assigneeResolved =
        input.assigneeUserId === undefined ? existing.assigneeUserId : input.assigneeUserId;
      const followUpResolved =
        input.followUpDueAt === undefined ? existing.followUpDueAt : input.followUpDueAt;

      const now = new Date();
      return ctx.db.transaction(async (tx) => {
        const [upd] = await tx
          .update(safetyObservation)
          .set({
            summary: input.summary?.trim() ?? existing.summary,
            details: input.details !== undefined ? (input.details ?? null) : existing.details,
            category: (input.category ?? existing.category) as ObsCategory,
            severity: (input.severity ?? existing.severity) as ObsSeverity,
            status: (input.status ?? existing.status) as ObsStatus,
            observedAt: input.observedAt ?? existing.observedAt,
            siteId: input.siteId === undefined ? existing.siteId : input.siteId,
            assigneeUserId: assigneeResolved,
            followUpDueAt: followUpResolved,
            retainUntil:
              input.retainUntil !== undefined ? (input.retainUntil ?? null) : existing.retainUntil,
            legalHold: input.legalHold !== undefined ? input.legalHold : existing.legalHold,
            updatedAt: now,
          })
          .where(eq(safetyObservation.id, existing.id))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "safety_observation.update",
          entityType: "safety_observation",
          entityId: existing.id,
          payload: { fieldsTouched: Object.keys(input).filter((k) => k !== "observationId") },
        });

        return upd;
      });
    }),

  linkToCapa: protectedMutation
    .input(orgScope.extend({ observationId: z.string().uuid(), correctiveActionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.SAFETY_OBSERVATION_UPDATE);
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.CAPA_READ);

      const [obs] = await ctx.db
        .select()
        .from(safetyObservation)
        .where(
          and(
            eq(safetyObservation.id, input.observationId),
            eq(safetyObservation.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!obs) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Observation not found." });
      }

      const [capa] = await ctx.db
        .select()
        .from(correctiveAction)
        .where(
          and(
            eq(correctiveAction.id, input.correctiveActionId),
            eq(correctiveAction.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!capa) {
        throw new TRPCError({ code: "NOT_FOUND", message: "CAPA not found." });
      }

      const now = new Date();
      return ctx.db.transaction(async (tx) => {
        const [upd] = await tx
          .update(safetyObservation)
          .set({
            linkedCorrectiveActionId: input.correctiveActionId,
            updatedAt: now,
            status: (obs.status === "closed" ? "closed" : "acknowledged") as ObsStatus,
          })
          .where(eq(safetyObservation.id, obs.id))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "safety_observation.link_capa",
          entityType: "safety_observation",
          entityId: obs.id,
          payload: { correctiveActionId: input.correctiveActionId },
        });

        return upd;
      });
    }),
});
