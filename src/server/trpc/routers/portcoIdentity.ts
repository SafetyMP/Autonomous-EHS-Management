import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  oidcJitClaimRule,
  organizationScimConfig,
  scimGroupMapping,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import {
  generateScimBearerToken,
  hashScimBearerToken,
} from "@/server/services/scim/scimToken";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

export const portcoIdentityRouter = router({
  scimPanel: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.ORG_ADMIN);

    const [config] = await ctx.db
      .select()
      .from(organizationScimConfig)
      .where(eq(organizationScimConfig.organizationId, input.organizationId))
      .limit(1);

    const groups = await ctx.db
      .select()
      .from(scimGroupMapping)
      .where(eq(scimGroupMapping.organizationId, input.organizationId))
      .orderBy(asc(scimGroupMapping.idpGroupId));

    return {
      enabled: config?.enabled ?? false,
      hasBearerToken: Boolean(config?.bearerTokenHash),
      defaultRoleSlug: config?.defaultRoleSlug ?? "supervisor",
      groupMappings: groups,
    };
  }),

  updateScimConfig: protectedMutation
    .input(
      orgScope.extend({
        enabled: z.boolean(),
        defaultRoleSlug: z.string().min(1).max(64),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.ORG_ADMIN);

      await ctx.db
        .insert(organizationScimConfig)
        .values({
          organizationId: input.organizationId,
          enabled: input.enabled,
          defaultRoleSlug: input.defaultRoleSlug,
        })
        .onConflictDoUpdate({
          target: organizationScimConfig.organizationId,
          set: {
            enabled: input.enabled,
            defaultRoleSlug: input.defaultRoleSlug,
            updatedAt: new Date(),
          },
        });

      await writeAuditLog(ctx.db, {
        organizationId: input.organizationId,
        actorUserId: ctx.user.id,
        action: "portco.scim_config.update",
        entityType: "organization",
        entityId: input.organizationId,
        payload: { enabled: input.enabled, defaultRoleSlug: input.defaultRoleSlug },
      });

      return { ok: true as const };
    }),

  rotateScimBearerToken: protectedMutation.input(orgScope).mutation(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.ORG_ADMIN);

    const plain = generateScimBearerToken();
    const hash = hashScimBearerToken(plain);

    const [existing] = await ctx.db
      .select()
      .from(organizationScimConfig)
      .where(eq(organizationScimConfig.organizationId, input.organizationId))
      .limit(1);

    if (!existing) {
      await ctx.db.insert(organizationScimConfig).values({
        organizationId: input.organizationId,
        enabled: false,
        bearerTokenHash: hash,
        defaultRoleSlug: "supervisor",
      });
    } else {
      await ctx.db
        .update(organizationScimConfig)
        .set({ bearerTokenHash: hash, updatedAt: new Date() })
        .where(eq(organizationScimConfig.organizationId, input.organizationId));
    }

    await writeAuditLog(ctx.db, {
      organizationId: input.organizationId,
      actorUserId: ctx.user.id,
      action: "portco.scim_token.rotate",
      entityType: "organization",
      entityId: input.organizationId,
      payload: {},
    });

    return { bearerToken: plain };
  }),

  upsertScimGroupMapping: protectedMutation
    .input(
      orgScope.extend({
        id: z.string().uuid().optional(),
        idpGroupId: z.string().min(1).max(256),
        idpGroupDisplayName: z.string().max(256).optional().nullable(),
        roleSlug: z.string().min(1).max(64),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.ORG_ADMIN);

      if (input.id) {
        const [updated] = await ctx.db
          .update(scimGroupMapping)
          .set({
            idpGroupId: input.idpGroupId,
            idpGroupDisplayName: input.idpGroupDisplayName ?? null,
            roleSlug: input.roleSlug,
          })
          .where(
            and(
              eq(scimGroupMapping.id, input.id),
              eq(scimGroupMapping.organizationId, input.organizationId),
            ),
          )
          .returning();
        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Group mapping not found." });
        }
        return updated;
      }

      const [inserted] = await ctx.db
        .insert(scimGroupMapping)
        .values({
          organizationId: input.organizationId,
          idpGroupId: input.idpGroupId,
          idpGroupDisplayName: input.idpGroupDisplayName ?? null,
          roleSlug: input.roleSlug,
        })
        .returning();
      return inserted!;
    }),

  deleteScimGroupMapping: protectedMutation
    .input(orgScope.extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.ORG_ADMIN);
      await ctx.db
        .delete(scimGroupMapping)
        .where(
          and(eq(scimGroupMapping.id, input.id), eq(scimGroupMapping.organizationId, input.organizationId)),
        );
      return { ok: true as const };
    }),

  listOidcJitRules: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.ORG_ADMIN);
    return ctx.db
      .select()
      .from(oidcJitClaimRule)
      .where(eq(oidcJitClaimRule.organizationId, input.organizationId))
      .orderBy(asc(oidcJitClaimRule.priority), asc(oidcJitClaimRule.createdAt));
  }),

  upsertOidcJitRule: protectedMutation
    .input(
      orgScope.extend({
        id: z.string().uuid().optional(),
        claimKey: z.string().min(1).max(128).default("groups"),
        matchValue: z.string().min(1).max(256),
        roleSlug: z.string().min(1).max(64),
        priority: z.number().int().min(0).max(10_000).default(100),
        enabled: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.ORG_ADMIN);

      if (input.id) {
        const [updated] = await ctx.db
          .update(oidcJitClaimRule)
          .set({
            claimKey: input.claimKey,
            matchValue: input.matchValue,
            roleSlug: input.roleSlug,
            priority: input.priority,
            enabled: input.enabled,
          })
          .where(
            and(
              eq(oidcJitClaimRule.id, input.id),
              eq(oidcJitClaimRule.organizationId, input.organizationId),
            ),
          )
          .returning();
        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "OIDC JIT rule not found." });
        }
        return updated;
      }

      const [inserted] = await ctx.db
        .insert(oidcJitClaimRule)
        .values({
          organizationId: input.organizationId,
          claimKey: input.claimKey,
          matchValue: input.matchValue,
          roleSlug: input.roleSlug,
          priority: input.priority,
          enabled: input.enabled,
        })
        .returning();
      return inserted!;
    }),

  deleteOidcJitRule: protectedMutation
    .input(orgScope.extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.db, ctx.user.id, input.organizationId, PERMISSIONS.ORG_ADMIN);
      await ctx.db
        .delete(oidcJitClaimRule)
        .where(
          and(eq(oidcJitClaimRule.id, input.id), eq(oidcJitClaimRule.organizationId, input.organizationId)),
        );
      return { ok: true as const };
    }),
});
