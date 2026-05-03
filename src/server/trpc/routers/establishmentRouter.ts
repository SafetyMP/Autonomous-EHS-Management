import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { establishment, establishmentMonthMetrics, establishmentYearMetrics } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { assertEstablishmentInOrg, assertSiteInOrg } from "../assertOrgScoped";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

export const establishmentRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.ESTABLISHMENT_READ,
    );

    return ctx.db
      .select()
      .from(establishment)
      .where(eq(establishment.organizationId, input.organizationId))
      .orderBy(desc(establishment.updatedAt));
  }),

  listYearMetrics: protectedProcedure
    .input(
      orgScope.extend({
        calendarYear: z.number().int().min(1970).max(2100).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ESTABLISHMENT_READ,
      );

      const estIds = (
        await ctx.db
          .select({ id: establishment.id })
          .from(establishment)
          .where(eq(establishment.organizationId, input.organizationId))
      ).map((r) => r.id);

      if (estIds.length === 0) return [];

      const cond = [inArray(establishmentYearMetrics.establishmentId, estIds)];
      if (input.calendarYear !== undefined) {
        cond.push(eq(establishmentYearMetrics.calendarYear, input.calendarYear));
      }

      return ctx.db
        .select()
        .from(establishmentYearMetrics)
        .where(and(...cond))
        .orderBy(desc(establishmentYearMetrics.calendarYear));
    }),

  listMonthMetrics: protectedProcedure
    .input(
      orgScope.extend({
        establishmentId: z.string().uuid(),
        calendarYear: z.number().int().min(1970).max(2100),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ESTABLISHMENT_READ,
      );
      await assertEstablishmentInOrg(ctx.db, input.organizationId, input.establishmentId);

      return ctx.db
        .select()
        .from(establishmentMonthMetrics)
        .where(
          and(
            eq(establishmentMonthMetrics.establishmentId, input.establishmentId),
            eq(establishmentMonthMetrics.calendarYear, input.calendarYear),
          ),
        )
        .orderBy(establishmentMonthMetrics.calendarMonth);
    }),

  create: protectedMutation
    .input(
      orgScope.extend({
        name: z.string().min(2).max(256),
        siteId: z.string().uuid().optional().nullable(),
        addressLine1: z.string().max(512).optional().nullable(),
        city: z.string().max(128).optional().nullable(),
        region: z.string().max(128).optional().nullable(),
        postalCode: z.string().max(32).optional().nullable(),
        country: z.string().max(2).optional().nullable(),
        naicsCode: z.string().max(6).optional().nullable(),
        epaFacilityId: z.string().max(64).optional().nullable(),
        stateFacilityId: z.string().max(64).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ESTABLISHMENT_WRITE,
      );
      if (input.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, input.siteId);
      }

      return ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(establishment)
          .values({
            organizationId: input.organizationId,
            siteId: input.siteId ?? null,
            name: input.name,
            addressLine1: input.addressLine1 ?? null,
            city: input.city ?? null,
            region: input.region ?? null,
            postalCode: input.postalCode ?? null,
            country: input.country ?? null,
            naicsCode: input.naicsCode ?? null,
            epaFacilityId: input.epaFacilityId ?? null,
            stateFacilityId: input.stateFacilityId ?? null,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create establishment.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "establishment.create",
          entityType: "establishment",
          entityId: created.id,
          payload: { name: input.name },
        });

        return created;
      });
    }),

  upsertMonthMetrics: protectedMutation
    .input(
      orgScope.extend({
        establishmentId: z.string().uuid(),
        calendarYear: z.number().int().min(1970).max(2100),
        calendarMonth: z.number().int().min(1).max(12),
        hoursWorked: z.number().int().min(0).optional().nullable(),
        avgEmployees: z.number().int().min(0).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ESTABLISHMENT_WRITE,
      );
      await assertEstablishmentInOrg(ctx.db, input.organizationId, input.establishmentId);

      return ctx.db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(establishmentMonthMetrics)
          .where(
            and(
              eq(establishmentMonthMetrics.establishmentId, input.establishmentId),
              eq(establishmentMonthMetrics.calendarYear, input.calendarYear),
              eq(establishmentMonthMetrics.calendarMonth, input.calendarMonth),
            ),
          )
          .limit(1);

        if (existing) {
          const [updated] = await tx
            .update(establishmentMonthMetrics)
            .set({
              hoursWorked: input.hoursWorked ?? null,
              avgEmployees: input.avgEmployees ?? null,
              updatedAt: new Date(),
            })
            .where(eq(establishmentMonthMetrics.id, existing.id))
            .returning();

          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "establishment_month_metrics.update",
            entityType: "establishment_month_metrics",
            entityId: existing.id,
            payload: {
              calendarYear: input.calendarYear,
              calendarMonth: input.calendarMonth,
            },
          });

          return updated;
        }

        const [inserted] = await tx
          .insert(establishmentMonthMetrics)
          .values({
            establishmentId: input.establishmentId,
            calendarYear: input.calendarYear,
            calendarMonth: input.calendarMonth,
            hoursWorked: input.hoursWorked ?? null,
            avgEmployees: input.avgEmployees ?? null,
          })
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "establishment_month_metrics.create",
          entityType: "establishment_month_metrics",
          entityId: inserted!.id,
          payload: {
            calendarYear: input.calendarYear,
            calendarMonth: input.calendarMonth,
          },
        });

        return inserted;
      });
    }),

  upsertYearMetrics: protectedMutation
    .input(
      orgScope.extend({
        establishmentId: z.string().uuid(),
        calendarYear: z.number().int().min(1970).max(2100),
        avgEmployees: z.number().int().min(0).optional().nullable(),
        totalHoursWorked: z.number().int().min(0).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ESTABLISHMENT_WRITE,
      );
      await assertEstablishmentInOrg(ctx.db, input.organizationId, input.establishmentId);

      return ctx.db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(establishmentYearMetrics)
          .where(
            and(
              eq(establishmentYearMetrics.establishmentId, input.establishmentId),
              eq(establishmentYearMetrics.calendarYear, input.calendarYear),
            ),
          )
          .limit(1);

        if (existing) {
          const [updated] = await tx
            .update(establishmentYearMetrics)
            .set({
              avgEmployees: input.avgEmployees ?? null,
              totalHoursWorked: input.totalHoursWorked ?? null,
              updatedAt: new Date(),
            })
            .where(eq(establishmentYearMetrics.id, existing.id))
            .returning();

          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "establishment_year_metrics.update",
            entityType: "establishment_year_metrics",
            entityId: existing.id,
            payload: { calendarYear: input.calendarYear },
          });

          return updated;
        }

        const [inserted] = await tx
          .insert(establishmentYearMetrics)
          .values({
            establishmentId: input.establishmentId,
            calendarYear: input.calendarYear,
            avgEmployees: input.avgEmployees ?? null,
            totalHoursWorked: input.totalHoursWorked ?? null,
          })
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "establishment_year_metrics.create",
          entityType: "establishment_year_metrics",
          entityId: inserted!.id,
          payload: { calendarYear: input.calendarYear },
        });

        return inserted;
      });
    }),
});
