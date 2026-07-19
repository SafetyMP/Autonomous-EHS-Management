import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Db } from "@/server/db";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  HEAT_NEP_CHECKLIST_VERSION,
  HEAT_NEP_CHECK_KEYS,
  HEAT_NEP_CHECK_LABELS,
  HEAT_PROGRAM_CHECK_STATUSES,
  isHeatNepCheckKey,
} from "@/lib/regulatory/heatNepAppendixI";
import {
  heatConditionLog,
  heatIllnessPreventionProgram,
  heatProgramCheckStatusEnum,
  heatProgramControlCheck,
  site,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

const checkStatuses = heatProgramCheckStatusEnum.enumValues as [string, ...string[]];

async function assertSiteInOrg(db: Db, organizationId: string, siteId: string) {
  const [s] = await db
    .select({ id: site.id })
    .from(site)
    .where(and(eq(site.id, siteId), eq(site.organizationId, organizationId)))
    .limit(1);
  if (!s) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Site not found in organization." });
  }
}

export const heatProgramRouter = router({
  checklistCatalog: protectedProcedure.query(() => ({
    version: HEAT_NEP_CHECKLIST_VERSION,
    keys: HEAT_NEP_CHECK_KEYS.map((key) => ({
      key,
      label: HEAT_NEP_CHECK_LABELS[key],
    })),
    statuses: HEAT_PROGRAM_CHECK_STATUSES,
    disclaimer:
      "Program aid aligned to OSHA Heat NEP Appendix I evaluation factors. Not a federal heat standard determination or Cal/OSHA compliance engine.",
  })),

  get: protectedProcedure
    .input(orgScope.extend({ siteId: z.string().uuid().optional().nullable() }))
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.HEAT_PROGRAM_READ,
      );

      const siteId = input.siteId ?? null;
      const [program] = await ctx.db
        .select()
        .from(heatIllnessPreventionProgram)
        .where(
          and(
            eq(heatIllnessPreventionProgram.organizationId, input.organizationId),
            siteId
              ? eq(heatIllnessPreventionProgram.siteId, siteId)
              : isNull(heatIllnessPreventionProgram.siteId),
          ),
        )
        .limit(1);

      if (!program) {
        return { program: null, checks: [] as (typeof heatProgramControlCheck.$inferSelect)[] };
      }

      const checks = await ctx.db
        .select()
        .from(heatProgramControlCheck)
        .where(eq(heatProgramControlCheck.programId, program.id));

      return { program, checks };
    }),

  upsert: protectedMutation
    .input(
      orgScope.extend({
        siteId: z.string().uuid().optional().nullable(),
        title: z.string().min(1).max(512).optional(),
        writtenPlanUri: z.string().max(2048).optional().nullable(),
        notes: z.string().max(20_000).optional().nullable(),
        coversOutdoor: z.boolean().optional(),
        coversIndoor: z.boolean().optional(),
        naicsNote: z.string().max(128).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.HEAT_PROGRAM_WRITE,
      );

      const siteId = input.siteId ?? null;
      if (siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, siteId);
      }

      return ctx.db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(heatIllnessPreventionProgram)
          .where(
            and(
              eq(heatIllnessPreventionProgram.organizationId, input.organizationId),
              siteId
                ? eq(heatIllnessPreventionProgram.siteId, siteId)
                : isNull(heatIllnessPreventionProgram.siteId),
            ),
          )
          .limit(1);

        let program = existing;
        if (!program) {
          const [created] = await tx
            .insert(heatIllnessPreventionProgram)
            .values({
              organizationId: input.organizationId,
              siteId,
              title: input.title ?? "Heat illness prevention program",
              writtenPlanUri: input.writtenPlanUri ?? null,
              notes: input.notes ?? null,
              coversOutdoor: input.coversOutdoor ?? true,
              coversIndoor: input.coversIndoor ?? false,
              naicsNote: input.naicsNote ?? null,
              checklistVersion: HEAT_NEP_CHECKLIST_VERSION,
            })
            .returning();
          if (!created) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create heat program.",
            });
          }
          program = created;
          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "heat_program.create",
            entityType: "heat_illness_prevention_program",
            entityId: program.id,
            payload: { siteId },
          });
        } else {
          const [updated] = await tx
            .update(heatIllnessPreventionProgram)
            .set({
              title: input.title ?? program.title,
              writtenPlanUri:
                input.writtenPlanUri !== undefined ? input.writtenPlanUri : program.writtenPlanUri,
              notes: input.notes !== undefined ? input.notes : program.notes,
              coversOutdoor: input.coversOutdoor ?? program.coversOutdoor,
              coversIndoor: input.coversIndoor ?? program.coversIndoor,
              naicsNote: input.naicsNote !== undefined ? input.naicsNote : program.naicsNote,
              updatedAt: new Date(),
            })
            .where(eq(heatIllnessPreventionProgram.id, program.id))
            .returning();
          if (!updated) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to update heat program.",
            });
          }
          program = updated;
          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "heat_program.update",
            entityType: "heat_illness_prevention_program",
            entityId: program.id,
            payload: {},
          });
        }

        const existingChecks = await tx
          .select()
          .from(heatProgramControlCheck)
          .where(eq(heatProgramControlCheck.programId, program.id));
        const existingKeys = new Set(existingChecks.map((c) => c.checkKey));
        for (const key of HEAT_NEP_CHECK_KEYS) {
          if (!existingKeys.has(key)) {
            await tx.insert(heatProgramControlCheck).values({
              organizationId: input.organizationId,
              programId: program.id,
              checkKey: key,
              status: "not_started",
            });
          }
        }

        const checks = await tx
          .select()
          .from(heatProgramControlCheck)
          .where(eq(heatProgramControlCheck.programId, program.id));

        return { program, checks };
      });
    }),

  upsertChecks: protectedMutation
    .input(
      orgScope.extend({
        programId: z.string().uuid(),
        checks: z
          .array(
            z.object({
              checkKey: z.string().min(1).max(64),
              status: z.enum(checkStatuses),
              evidenceNotes: z.string().max(20_000).optional().nullable(),
              reviewedAt: z.coerce.date().optional().nullable(),
            }),
          )
          .min(1)
          .max(32),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.HEAT_PROGRAM_WRITE,
      );

      for (const c of input.checks) {
        if (!isHeatNepCheckKey(c.checkKey)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Unknown heat checklist key: ${c.checkKey}`,
          });
        }
      }

      return ctx.db.transaction(async (tx) => {
        const [program] = await tx
          .select()
          .from(heatIllnessPreventionProgram)
          .where(
            and(
              eq(heatIllnessPreventionProgram.id, input.programId),
              eq(heatIllnessPreventionProgram.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!program) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Heat program not found." });
        }

        for (const c of input.checks) {
          const [existing] = await tx
            .select()
            .from(heatProgramControlCheck)
            .where(
              and(
                eq(heatProgramControlCheck.programId, program.id),
                eq(heatProgramControlCheck.checkKey, c.checkKey),
              ),
            )
            .limit(1);

          if (existing) {
            await tx
              .update(heatProgramControlCheck)
              .set({
                status: c.status as (typeof heatProgramCheckStatusEnum.enumValues)[number],
                evidenceNotes:
                  c.evidenceNotes !== undefined ? c.evidenceNotes : existing.evidenceNotes,
                reviewedAt: c.reviewedAt !== undefined ? c.reviewedAt : existing.reviewedAt,
                updatedAt: new Date(),
              })
              .where(eq(heatProgramControlCheck.id, existing.id));
          } else {
            await tx.insert(heatProgramControlCheck).values({
              organizationId: input.organizationId,
              programId: program.id,
              checkKey: c.checkKey,
              status: c.status as (typeof heatProgramCheckStatusEnum.enumValues)[number],
              evidenceNotes: c.evidenceNotes ?? null,
              reviewedAt: c.reviewedAt ?? null,
            });
          }
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "heat_program.upsert_checks",
          entityType: "heat_illness_prevention_program",
          entityId: program.id,
          payload: { count: input.checks.length },
        });

        const checks = await tx
          .select()
          .from(heatProgramControlCheck)
          .where(eq(heatProgramControlCheck.programId, program.id));
        return { program, checks };
      });
    }),

  listConditionLogs: protectedProcedure
    .input(
      orgScope.extend({
        programId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.HEAT_PROGRAM_READ,
      );

      const conditions = [
        eq(heatConditionLog.organizationId, input.organizationId),
        ...(input.programId ? [eq(heatConditionLog.programId, input.programId)] : []),
      ];

      return ctx.db
        .select()
        .from(heatConditionLog)
        .where(and(...conditions))
        .orderBy(desc(heatConditionLog.observedAt))
        .limit(input.limit ?? 50);
    }),

  createConditionLog: protectedMutation
    .input(
      orgScope.extend({
        programId: z.string().uuid().optional().nullable(),
        siteId: z.string().uuid().optional().nullable(),
        observedAt: z.coerce.date(),
        heatIndexF: z.number().optional().nullable(),
        wbgtF: z.number().optional().nullable(),
        source: z.string().max(128).optional().nullable(),
        notes: z.string().max(8192).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.HEAT_PROGRAM_WRITE,
      );

      if (input.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, input.siteId);
      }
      if (input.programId) {
        const [p] = await ctx.db
          .select()
          .from(heatIllnessPreventionProgram)
          .where(
            and(
              eq(heatIllnessPreventionProgram.id, input.programId),
              eq(heatIllnessPreventionProgram.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (!p) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Heat program not found." });
        }
      }

      return ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(heatConditionLog)
          .values({
            organizationId: input.organizationId,
            programId: input.programId ?? null,
            siteId: input.siteId ?? null,
            observedAt: input.observedAt,
            heatIndexF: input.heatIndexF ?? null,
            wbgtF: input.wbgtF ?? null,
            source: input.source ?? null,
            notes: input.notes ?? null,
          })
          .returning();
        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create heat condition log.",
          });
        }
        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "heat_program.condition_log.create",
          entityType: "heat_condition_log",
          entityId: created.id,
          payload: {},
        });
        return created;
      });
    }),

  exportJson: protectedProcedure
    .input(orgScope.extend({ siteId: z.string().uuid().optional().nullable() }))
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.HEAT_PROGRAM_READ,
      );

      const siteId = input.siteId ?? null;
      const [program] = await ctx.db
        .select()
        .from(heatIllnessPreventionProgram)
        .where(
          and(
            eq(heatIllnessPreventionProgram.organizationId, input.organizationId),
            siteId
              ? eq(heatIllnessPreventionProgram.siteId, siteId)
              : isNull(heatIllnessPreventionProgram.siteId),
          ),
        )
        .limit(1);

      if (!program) {
        return {
          disclaimer:
            "Program aid only — not agency filing or a federal heat standard determination.",
          checklistVersion: HEAT_NEP_CHECKLIST_VERSION,
          program: null,
          checks: [],
          conditionLogs: [],
        };
      }

      const checks = await ctx.db
        .select()
        .from(heatProgramControlCheck)
        .where(eq(heatProgramControlCheck.programId, program.id));
      const conditionLogs = await ctx.db
        .select()
        .from(heatConditionLog)
        .where(eq(heatConditionLog.programId, program.id))
        .orderBy(desc(heatConditionLog.observedAt))
        .limit(100);

      return {
        disclaimer:
          "Program aid only — not agency filing or a federal heat standard determination.",
        checklistVersion: HEAT_NEP_CHECKLIST_VERSION,
        program,
        checks: checks.map((c) => ({
          ...c,
          label: isHeatNepCheckKey(c.checkKey) ? HEAT_NEP_CHECK_LABELS[c.checkKey] : c.checkKey,
        })),
        conditionLogs,
      };
    }),
});
