import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission, userHasPermission } from "@/lib/rbac";
import {
  controlledDocument,
  environmentalAspect,
  hazard,
  incident,
  incidentSeverityEnum,
  incidentStatusEnum,
  incidentTypeEnum,
  workflowTransition,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { computeDefaultRetainUntilForNewIncident } from "@/server/services/incidentRetentionDefault";
import { allowedIncidentTransition } from "@/lib/workflow/incidentTransitions";
import {
  assertAspectInOrg,
  assertExternalPartyInOrg,
  assertHazardInOrg,
  assertSiteInOrg,
} from "../assertOrgScoped";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

const severities = incidentSeverityEnum.enumValues as [
  string,
  ...string[],
];
const incidentStatuses = incidentStatusEnum.enumValues as [string, ...string[]];
const incidentTypes = incidentTypeEnum.enumValues as [string, ...string[]];

const rcaFiveWhyStepSchema = z.object({
  why: z.string().max(200),
  answer: z.string().max(4000),
});

export const incidentRouter = router({
  list: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.INCIDENT_READ,
    );

    const readSensitive = await userHasPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.INCIDENT_READ_SENSITIVE,
    );

    const rows = await ctx.db
      .select()
      .from(incident)
      .where(eq(incident.organizationId, input.organizationId))
      .orderBy(desc(incident.createdAt));

    if (readSensitive) {
      return rows;
    }

    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      siteId: r.siteId,
      title: r.title,
      incidentType: r.incidentType,
      severity: r.severity,
      status: r.status,
      occurredAt: r.occurredAt,
      regulatoryNotificationRequired: r.regulatoryNotificationRequired,
      linkedHazardId: r.linkedHazardId,
      linkedEnvironmentalAspectId: r.linkedEnvironmentalAspectId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      legalHold: r.legalHold,
      retainUntil: r.retainUntil,
      anonymizedAt: r.anonymizedAt,
      pseudonymId: r.pseudonymId,
    }));
  }),

  get: protectedProcedure
    .input(
      orgScope.extend({
        incidentId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INCIDENT_READ,
      );

      const readSensitive = await userHasPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INCIDENT_READ_SENSITIVE,
      );

      const [row] = await ctx.db
        .select()
        .from(incident)
        .where(
          and(
            eq(incident.id, input.incidentId),
            eq(incident.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found." });
      }

      if (readSensitive) {
        return row;
      }

      return {
        id: row.id,
        organizationId: row.organizationId,
        siteId: row.siteId,
        title: row.title,
        incidentType: row.incidentType,
        severity: row.severity,
        status: row.status,
        occurredAt: row.occurredAt,
        regulatoryNotificationRequired: row.regulatoryNotificationRequired,
        linkedHazardId: row.linkedHazardId,
        linkedEnvironmentalAspectId: row.linkedEnvironmentalAspectId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        legalHold: row.legalHold,
        retainUntil: row.retainUntil,
        anonymizedAt: row.anonymizedAt,
        pseudonymId: row.pseudonymId,
      };
    }),

  /** Related IMS entities and shortcuts for investigation workspace UX. */
  workspaceLinks: protectedProcedure
    .input(
      orgScope.extend({
        incidentId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INCIDENT_READ,
      );

      const [row] = await ctx.db
        .select()
        .from(incident)
        .where(
          and(
            eq(incident.id, input.incidentId),
            eq(incident.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found." });
      }

      let hazardLink: { id: string; title: string } | null = null;
      if (
        row.linkedHazardId &&
        (await userHasPermission(
          ctx.db,
          ctx.user.id,
          input.organizationId,
          PERMISSIONS.HAZARD_READ,
        ))
      ) {
        const [h] = await ctx.db
          .select({ id: hazard.id, title: hazard.title })
          .from(hazard)
          .where(
            and(
              eq(hazard.id, row.linkedHazardId),
              eq(hazard.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        hazardLink = h ?? null;
      }

      let aspectLink: { id: string; name: string } | null = null;
      if (
        row.linkedEnvironmentalAspectId &&
        (await userHasPermission(
          ctx.db,
          ctx.user.id,
          input.organizationId,
          PERMISSIONS.ASPECT_READ,
        ))
      ) {
        const [a] = await ctx.db
          .select({ id: environmentalAspect.id, name: environmentalAspect.name })
          .from(environmentalAspect)
          .where(
            and(
              eq(environmentalAspect.id, row.linkedEnvironmentalAspectId),
              eq(environmentalAspect.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        aspectLink = a ?? null;
      }

      let recentDocuments: { id: string; title: string; documentNumber: string }[] = [];
      if (
        await userHasPermission(
          ctx.db,
          ctx.user.id,
          input.organizationId,
          PERMISSIONS.DOCUMENT_READ,
        )
      ) {
        recentDocuments = await ctx.db
          .select({
            id: controlledDocument.id,
            title: controlledDocument.title,
            documentNumber: controlledDocument.documentNumber,
          })
          .from(controlledDocument)
          .where(eq(controlledDocument.organizationId, input.organizationId))
          .orderBy(desc(controlledDocument.updatedAt))
          .limit(5);
      }

      return {
        hazard: hazardLink,
        environmentalAspect: aspectLink,
        recentDocuments,
      };
    }),

  create: protectedMutation
    .input(
      orgScope.extend({
        siteId: z.string().uuid().optional(),
        title: z.string().min(3).max(512),
        description: z.string().min(1).max(50_000),
        incidentType: z.enum(incidentTypes).optional(),
        severity: z.enum(severities),
        occurredAt: z.coerce.date().optional(),
        externalPartyId: z.string().uuid().optional(),
        investigationOwnerUserId: z.string().optional(),
        immediateActions: z.string().max(50_000).optional(),
        regulatoryNotificationRequired: z.boolean().optional(),
        investigationNotes: z.string().max(50_000).optional(),
        rootCauseSummary: z.string().max(50_000).optional(),
        linkedHazardId: z.string().uuid().optional(),
        linkedEnvironmentalAspectId: z.string().uuid().optional(),
        /** Override org default from `data_retention_policy` (`incident_general`). */
        retainUntil: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INCIDENT_CREATE,
      );

      if (input.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, input.siteId);
      }

      if (input.externalPartyId) {
        await assertExternalPartyInOrg(ctx.db, input.organizationId, input.externalPartyId);
      }
      if (input.linkedHazardId) {
        await assertHazardInOrg(ctx.db, input.organizationId, input.linkedHazardId);
      }
      if (input.linkedEnvironmentalAspectId) {
        await assertAspectInOrg(ctx.db, input.organizationId, input.linkedEnvironmentalAspectId);
      }

      const referenceDate = input.occurredAt ?? new Date();
      const retainUntilDefault =
        input.retainUntil ??
        (await computeDefaultRetainUntilForNewIncident(
          ctx.db,
          input.organizationId,
          referenceDate,
        ));

      return ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(incident)
          .values({
            organizationId: input.organizationId,
            siteId: input.siteId ?? null,
            title: input.title,
            description: input.description,
            incidentType: (input.incidentType ??
              "other") as (typeof incidentTypeEnum.enumValues)[number],
            severity: input.severity as (typeof incidentSeverityEnum.enumValues)[number],
            status: "open" as (typeof incidentStatusEnum.enumValues)[number],
            reportedByUserId: ctx.user.id,
            investigationOwnerUserId: input.investigationOwnerUserId ?? null,
            occurredAt: input.occurredAt ?? null,
            externalPartyId: input.externalPartyId ?? null,
            immediateActions: input.immediateActions ?? null,
            regulatoryNotificationRequired: input.regulatoryNotificationRequired ?? false,
            investigationNotes: input.investigationNotes ?? null,
            rootCauseSummary: input.rootCauseSummary ?? null,
            linkedHazardId: input.linkedHazardId ?? null,
            linkedEnvironmentalAspectId: input.linkedEnvironmentalAspectId ?? null,
            retainUntil: retainUntilDefault,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create incident.",
          });
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "incident.create",
          entityType: "incident",
          entityId: created.id,
          payload: { title: input.title, severity: input.severity },
        });

        return created;
      });
    }),

  updateStatus: protectedMutation
    .input(
      orgScope.extend({
        incidentId: z.string().uuid(),
        status: z.enum(incidentStatuses),
        closureJustification: z.string().min(20).max(4000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INCIDENT_UPDATE,
      );

      const [existing] = await ctx.db
        .select()
        .from(incident)
        .where(
          and(
            eq(incident.id, input.incidentId),
            eq(incident.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found." });
      }

      if (
        !allowedIncidentTransition(
          existing.status,
          input.status as (typeof incidentStatusEnum.enumValues)[number],
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid status transition: ${existing.status} → ${input.status}`,
        });
      }

      if (input.status === "closed") {
        const rc = (existing.rootCauseSummary ?? "").trim();
        if (rc.length < 20) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot close incident: add a root cause summary (at least 20 characters) on the incident record first.",
          });
        }
        const cj = (input.closureJustification ?? "").trim();
        if (cj.length < 20) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Closing an incident requires a closure justification (why it is safe to close, at least 20 characters).",
          });
        }
      }

      return ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(incident)
          .set({
            status: input.status as (typeof incidentStatusEnum.enumValues)[number],
            updatedAt: new Date(),
          })
          .where(eq(incident.id, input.incidentId))
          .returning();

        await tx.insert(workflowTransition).values({
          organizationId: input.organizationId,
          entityType: "incident",
          entityId: input.incidentId,
          fromStatus: existing.status,
          toStatus: input.status,
          actorUserId: ctx.user.id,
        });

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "incident.update_status",
          entityType: "incident",
          entityId: input.incidentId,
          payload: {
            from: existing.status,
            to: input.status,
            ...(input.status === "closed" && input.closureJustification
              ? { closureJustification: input.closureJustification }
              : {}),
          },
        });

        return updated;
      });
    }),

  update: protectedMutation
    .input(
      orgScope.extend({
        incidentId: z.string().uuid(),
        title: z.string().min(3).max(512).optional(),
        description: z.string().min(1).max(50_000).optional(),
        incidentType: z.enum(incidentTypes).optional(),
        severity: z.enum(severities).optional(),
        siteId: z.string().uuid().optional().nullable(),
        investigationOwnerUserId: z.string().optional().nullable(),
        externalPartyId: z.string().uuid().optional().nullable(),
        immediateActions: z.string().max(50_000).optional().nullable(),
        regulatoryNotificationRequired: z.boolean().optional(),
        investigationNotes: z.string().max(50_000).optional().nullable(),
        rootCauseSummary: z.string().max(50_000).optional().nullable(),
        linkedHazardId: z.string().uuid().optional().nullable(),
        linkedEnvironmentalAspectId: z.string().uuid().optional().nullable(),
        occurredAt: z.coerce.date().optional().nullable(),
        legalHold: z.boolean().optional(),
        retainUntil: z.coerce.date().optional().nullable(),
        rcaFiveWhys: z.array(rcaFiveWhyStepSchema).max(5).optional(),
        contributingFactors: z.array(z.string().max(500)).max(24).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.INCIDENT_UPDATE,
      );

      const [existing] = await ctx.db
        .select()
        .from(incident)
        .where(
          and(
            eq(incident.id, input.incidentId),
            eq(incident.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found." });
      }

      if (input.siteId) {
        await assertSiteInOrg(ctx.db, input.organizationId, input.siteId);
      }
      if (input.externalPartyId) {
        await assertExternalPartyInOrg(ctx.db, input.organizationId, input.externalPartyId);
      }
      if (input.linkedHazardId) {
        await assertHazardInOrg(ctx.db, input.organizationId, input.linkedHazardId);
      }
      if (input.linkedEnvironmentalAspectId) {
        await assertAspectInOrg(ctx.db, input.organizationId, input.linkedEnvironmentalAspectId);
      }

      return ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(incident)
          .set({
            title: input.title ?? existing.title,
            description: input.description ?? existing.description,
            incidentType:
              (input.incidentType as (typeof incidentTypeEnum.enumValues)[number] | undefined) ??
              existing.incidentType,
            severity:
              (input.severity as (typeof incidentSeverityEnum.enumValues)[number] | undefined) ??
              existing.severity,
            siteId: input.siteId !== undefined ? input.siteId : existing.siteId,
            investigationOwnerUserId:
              input.investigationOwnerUserId !== undefined
                ? input.investigationOwnerUserId
                : existing.investigationOwnerUserId,
            externalPartyId:
              input.externalPartyId !== undefined ? input.externalPartyId : existing.externalPartyId,
            immediateActions:
              input.immediateActions !== undefined
                ? input.immediateActions
                : existing.immediateActions,
            regulatoryNotificationRequired:
              input.regulatoryNotificationRequired !== undefined
                ? input.regulatoryNotificationRequired
                : existing.regulatoryNotificationRequired,
            investigationNotes:
              input.investigationNotes !== undefined
                ? input.investigationNotes
                : existing.investigationNotes,
            rootCauseSummary:
              input.rootCauseSummary !== undefined
                ? input.rootCauseSummary
                : existing.rootCauseSummary,
            linkedHazardId:
              input.linkedHazardId !== undefined
                ? input.linkedHazardId
                : existing.linkedHazardId,
            linkedEnvironmentalAspectId:
              input.linkedEnvironmentalAspectId !== undefined
                ? input.linkedEnvironmentalAspectId
                : existing.linkedEnvironmentalAspectId,
            occurredAt:
              input.occurredAt !== undefined ? input.occurredAt : existing.occurredAt,
            legalHold:
              input.legalHold !== undefined ? input.legalHold : existing.legalHold,
            retainUntil:
              input.retainUntil !== undefined ? input.retainUntil : existing.retainUntil,
            rcaFiveWhys:
              input.rcaFiveWhys !== undefined ? input.rcaFiveWhys : existing.rcaFiveWhys,
            contributingFactors:
              input.contributingFactors !== undefined
                ? input.contributingFactors
                : existing.contributingFactors,
            updatedAt: new Date(),
          })
          .where(eq(incident.id, input.incidentId))
          .returning();

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "incident.update",
          entityType: "incident",
          entityId: input.incidentId,
          payload: {},
        });

        return updated;
      });
    }),
});
