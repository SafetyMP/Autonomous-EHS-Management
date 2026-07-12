import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OPERATIONAL_WEBHOOK_EVENT_IDS } from "@/lib/operationalWebhook/eventTypes";
import { assertSafeOperationalWebhookUrl } from "@/lib/operationalWebhook/urlValidation";
import { PERMISSIONS, assertPermission, userHasPermission } from "@/lib/rbac";
import {
  membership,
  organization,
  organizationSetupStep,
  operationalWebhookEndpoint,
  site,
  authUser,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { deliverOperationalWebhookTest } from "@/server/services/operationalWebhookDispatch";
import { protectedMutation, protectedProcedure, router } from "../init";

function assertSafeOperationalWebhookTarget(targetUrl: string): void {
  try {
    assertSafeOperationalWebhookUrl(targetUrl);
  } catch (err) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: err instanceof Error ? err.message : "Invalid webhook URL.",
    });
  }
}

const operationalWebhookEventZ = z.enum(OPERATIONAL_WEBHOOK_EVENT_IDS);

function safeWebhookHost(urlStr: string): string | null {
  try {
    return new URL(urlStr).host;
  } catch {
    return null;
  }
}

export const organizationRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: organization.id,
        name: organization.name,
        contextSyncEnabled: organization.contextSyncEnabled,
      })
      .from(membership)
      .innerJoin(organization, eq(membership.organizationId, organization.id))
      .where(eq(membership.userId, ctx.user.id));
  }),

  /**
   * Chooses field launcher vs full command center for `/dashboard` — heuristic from existing RBAC keys (no new permissions).
   */
  dashboardHomeLayout: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [m] = await ctx.db
        .select()
        .from(membership)
        .where(
          and(eq(membership.userId, ctx.user.id), eq(membership.organizationId, input.organizationId)),
        )
        .limit(1);

      if (!m) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this organization.",
        });
      }

      const db = ctx.db;
      const uid = ctx.user.id;
      const oid = input.organizationId;

      const admin = await userHasPermission(db, uid, oid, PERMISSIONS.ORG_ADMIN);

      const canIncidentCreate = await userHasPermission(db, uid, oid, PERMISSIONS.INCIDENT_CREATE);
      const canObservationCreate = await userHasPermission(db, uid, oid, PERMISSIONS.SAFETY_OBSERVATION_CREATE);
      const canInspectionCreate = await userHasPermission(db, uid, oid, PERMISSIONS.INSPECTION_CREATE);
      const canPermitCreate = await userHasPermission(db, uid, oid, PERMISSIONS.WORK_PERMIT_CREATE);
      const canIncidentRead = await userHasPermission(db, uid, oid, PERMISSIONS.INCIDENT_READ);
      const canObservationRead = await userHasPermission(db, uid, oid, PERMISSIONS.SAFETY_OBSERVATION_READ);
      const canInspectionRead = await userHasPermission(db, uid, oid, PERMISSIONS.INSPECTION_READ);
      const canPermitRead = await userHasPermission(db, uid, oid, PERMISSIONS.WORK_PERMIT_READ);
      const [canIntegrationRead, canIntegrationWrite, canAuditTrailRead] = await Promise.all([
        userHasPermission(db, uid, oid, PERMISSIONS.INTEGRATION_READ),
        userHasPermission(db, uid, oid, PERMISSIONS.INTEGRATION_WRITE),
        userHasPermission(db, uid, oid, PERMISSIONS.AUDIT_TRAIL_READ),
      ]);

      const managementReads = await Promise.all([
        userHasPermission(db, uid, oid, PERMISSIONS.CAPA_READ),
        userHasPermission(db, uid, oid, PERMISSIONS.FINDING_READ),
        userHasPermission(db, uid, oid, PERMISSIONS.MR_READ),
        userHasPermission(db, uid, oid, PERMISSIONS.KPI_READ),
      ]);

      const capaRead = managementReads[0] ?? false;
      const mgmtScore = managementReads.filter(Boolean).length;
      const isDesk =
        admin ||
        mgmtScore >= 2 ||
        (capaRead && canInspectionRead);

      const anyFieldCreate =
        canIncidentCreate || canObservationCreate || canInspectionCreate || canPermitCreate;

      let layout: "field" | "desk";
      if (isDesk || !anyFieldCreate) {
        layout = "desk";
      } else {
        layout = "field";
      }

      const persona: "field" | "desk_contributor" | "desk_supervisor" =
        layout === "field"
          ? "field"
          : admin || mgmtScore >= 2
            ? "desk_supervisor"
            : "desk_contributor";

      return {
        layout,
        persona,
        showFullKpis: persona === "desk_supervisor",
        showAdminPanelsOnHome: false,
        isAdmin: admin,
        permissions: {
          canIncidentCreate,
          canObservationCreate,
          canInspectionCreate,
          canPermitCreate,
          canIncidentRead,
          canObservationRead,
          canInspectionRead,
          canPermitRead,
          canIntegrationRead,
          canIntegrationWrite,
          canAuditTrailRead,
        },
      };
    }),

  sites: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [m] = await ctx.db
        .select()
        .from(membership)
        .where(
          and(
            eq(membership.userId, ctx.user.id),
            eq(membership.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!m) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this organization.",
        });
      }

      return ctx.db
        .select()
        .from(site)
        .where(eq(site.organizationId, input.organizationId));
    }),

  /** Active org members for assignment UIs (CAPA owner, etc.). */
  members: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [m] = await ctx.db
        .select()
        .from(membership)
        .where(
          and(
            eq(membership.userId, ctx.user.id),
            eq(membership.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!m) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this organization.",
        });
      }

      return ctx.db
        .select({
          userId: membership.userId,
          email: authUser.email,
        })
        .from(membership)
        .innerJoin(authUser, eq(membership.userId, authUser.id))
        .where(eq(membership.organizationId, input.organizationId))
        .orderBy(authUser.email);
    }),

  setupSteps: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [m] = await ctx.db
        .select()
        .from(membership)
        .where(
          and(
            eq(membership.userId, ctx.user.id),
            eq(membership.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!m) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this organization.",
        });
      }

      return ctx.db
        .select()
        .from(organizationSetupStep)
        .where(eq(organizationSetupStep.organizationId, input.organizationId));
    }),

  completeSetupStep: protectedMutation
    .input(
      z.object({
        organizationId: z.string().uuid(),
        stepKey: z.string().min(1).max(64),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ORG_SETUP_WRITE,
      );

      return ctx.db.transaction(async (tx) => {
        await tx
          .insert(organizationSetupStep)
          .values({
            organizationId: input.organizationId,
            stepKey: input.stepKey,
            completedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              organizationSetupStep.organizationId,
              organizationSetupStep.stepKey,
            ],
            set: { completedAt: new Date() },
          });

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "org.setup.complete_step",
          entityType: "organization_setup_step",
          entityId: input.stepKey,
        });

        return { ok: true as const };
      });
    }),

  /** Org admins toggle REST `/api/contextsync/*` + agent-class claims for IDE/agent integrations. */
  updateContextSyncEnabled: protectedMutation
    .input(
      z.object({
        organizationId: z.string().uuid(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ORG_ADMIN,
      );

      return ctx.db.transaction(async (tx) => {
        await tx
          .update(organization)
          .set({
            contextSyncEnabled: input.enabled,
            updatedAt: new Date(),
          })
          .where(eq(organization.id, input.organizationId));

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "organization.context_sync_enabled.update",
          entityType: "organization",
          entityId: input.organizationId,
          payload: { enabled: input.enabled },
        });

        return { ok: true as const };
      });
    }),

  /**
   * Integrations UX: admins see configured operational webhooks without exposing secrets.
   * Others receive `allowed:false` — not an error — so read-only integrations pages can degrade gracefully.
   */
  operationalWebhooksPanel: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [m] = await ctx.db
        .select()
        .from(membership)
        .where(
          and(
            eq(membership.userId, ctx.user.id),
            eq(membership.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!m) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this organization.",
        });
      }

      const admin = await userHasPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ORG_ADMIN,
      );
      if (!admin) {
        return { allowed: false as const, endpoints: [] };
      }

      const rows = await ctx.db
        .select({
          id: operationalWebhookEndpoint.id,
          targetUrl: operationalWebhookEndpoint.targetUrl,
          subscribedEvents: operationalWebhookEndpoint.subscribedEvents,
          enabled: operationalWebhookEndpoint.enabled,
          secret: operationalWebhookEndpoint.secret,
          createdAt: operationalWebhookEndpoint.createdAt,
          updatedAt: operationalWebhookEndpoint.updatedAt,
        })
        .from(operationalWebhookEndpoint)
        .where(eq(operationalWebhookEndpoint.organizationId, input.organizationId));

      return {
        allowed: true as const,
        endpoints: rows.map((row) => ({
          id: row.id,
          targetUrl: row.targetUrl,
          subscribedEvents: Array.isArray(row.subscribedEvents) ? row.subscribedEvents : [],
          enabled: row.enabled,
          hasSecretConfigured: typeof row.secret === "string" && row.secret.trim().length > 0,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        })),
      };
    }),

  /** Creates an outbound operational webhook receiver (cron / integration failures). Org admins only. */
  createOperationalWebhook: protectedMutation
    .input(
      z.object({
        organizationId: z.string().uuid(),
        targetUrl: z.string().url().max(2048),
        secret: z.string().min(16).max(256).optional(),
        subscribedEvents: z.array(operationalWebhookEventZ).min(1).max(8),
        enabled: z.boolean().optional().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ORG_ADMIN,
      );

      assertSafeOperationalWebhookTarget(input.targetUrl);

      const [{ n }] = await ctx.db
        .select({ n: count() })
        .from(operationalWebhookEndpoint)
        .where(eq(operationalWebhookEndpoint.organizationId, input.organizationId));

      if (Number(n ?? 0) >= 12) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Maximum operational webhook endpoints (12) reached for this organization.",
        });
      }

      const now = new Date();
      const [row] = await ctx.db
        .insert(operationalWebhookEndpoint)
        .values({
          organizationId: input.organizationId,
          targetUrl: input.targetUrl,
          secret: input.secret ?? null,
          subscribedEvents: input.subscribedEvents,
          enabled: input.enabled,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: operationalWebhookEndpoint.id });

      await writeAuditLog(ctx.db, {
        organizationId: input.organizationId,
        actorUserId: ctx.user.id,
        action: "organization.operational_webhook.create",
        entityType: "operational_webhook_endpoint",
        entityId: row?.id ?? input.organizationId,
        payload: { targetHost: safeWebhookHost(input.targetUrl) },
      });

      return { ok: true as const, id: row?.id };
    }),

  /** Patches webhook URL, subscriptions, rotation secret, enabled flag — org admins only. */
  updateOperationalWebhook: protectedMutation
    .input(
      z.object({
        organizationId: z.string().uuid(),
        endpointId: z.string().uuid(),
        targetUrl: z.string().url().max(2048).optional(),
        subscribedEvents: z.array(operationalWebhookEventZ).min(1).max(8).optional(),
        secret: z.union([z.string().min(16).max(256), z.literal("")]).optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ORG_ADMIN,
      );

      const [existing] = await ctx.db
        .select()
        .from(operationalWebhookEndpoint)
        .where(
          and(
            eq(operationalWebhookEndpoint.id, input.endpointId),
            eq(operationalWebhookEndpoint.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Webhook endpoint not found." });
      }

      type DataPatch = {
        targetUrl?: string;
        subscribedEvents?: string[];
        enabled?: boolean;
        secret?: string | null;
      };

      const dataPatch: DataPatch = {};
      if (input.targetUrl !== undefined) {
        assertSafeOperationalWebhookTarget(input.targetUrl);
        dataPatch.targetUrl = input.targetUrl;
      }
      if (input.subscribedEvents !== undefined)
        dataPatch.subscribedEvents = input.subscribedEvents;
      if (input.enabled !== undefined) dataPatch.enabled = input.enabled;
      if (input.secret !== undefined) {
        dataPatch.secret = input.secret === "" ? null : input.secret;
      }

      if (Object.keys(dataPatch).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No changes supplied.",
        });
      }

      await ctx.db
        .update(operationalWebhookEndpoint)
        .set({ ...dataPatch, updatedAt: new Date() })
        .where(eq(operationalWebhookEndpoint.id, input.endpointId));

      await writeAuditLog(ctx.db, {
        organizationId: input.organizationId,
        actorUserId: ctx.user.id,
        action: "organization.operational_webhook.update",
        entityType: "operational_webhook_endpoint",
        entityId: input.endpointId,
        payload: {
          patchedKeys: Object.keys(dataPatch),
          targetHost: input.targetUrl ? safeWebhookHost(input.targetUrl) : undefined,
        },
      });

      return { ok: true as const };
    }),

  deleteOperationalWebhook: protectedMutation
    .input(
      z.object({
        organizationId: z.string().uuid(),
        endpointId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ORG_ADMIN,
      );

      await ctx.db
        .delete(operationalWebhookEndpoint)
        .where(
          and(
            eq(operationalWebhookEndpoint.id, input.endpointId),
            eq(operationalWebhookEndpoint.organizationId, input.organizationId),
          ),
        );

      await writeAuditLog(ctx.db, {
        organizationId: input.organizationId,
        actorUserId: ctx.user.id,
        action: "organization.operational_webhook.delete",
        entityType: "operational_webhook_endpoint",
        entityId: input.endpointId,
      });

      return { ok: true as const };
    }),

  /** Sends a test payload to verify Slack/Teams/generic webhook wiring. Org admins only. */
  sendOperationalWebhookTest: protectedMutation
    .input(
      z.object({
        organizationId: z.string().uuid(),
        endpointId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.ORG_ADMIN,
      );

      const [existing] = await ctx.db
        .select()
        .from(operationalWebhookEndpoint)
        .where(
          and(
            eq(operationalWebhookEndpoint.id, input.endpointId),
            eq(operationalWebhookEndpoint.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Webhook endpoint not found." });
      }
      if (!existing.enabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enable the endpoint before sending a test.",
        });
      }

      const subscribed = (Array.isArray(existing.subscribedEvents)
        ? existing.subscribedEvents
        : []) as (typeof OPERATIONAL_WEBHOOK_EVENT_IDS)[number][];

      const { channel } = await deliverOperationalWebhookTest({
        targetUrl: existing.targetUrl,
        secret: existing.secret,
        organizationId: input.organizationId,
        subscribedEvents: subscribed,
      });

      await writeAuditLog(ctx.db, {
        organizationId: input.organizationId,
        actorUserId: ctx.user.id,
        action: "organization.operational_webhook.test_send",
        entityType: "operational_webhook_endpoint",
        entityId: input.endpointId,
        payload: { channel, targetHost: safeWebhookHost(existing.targetUrl) },
      });

      return { ok: true as const, channel };
    }),
});
