import { and, asc, count, desc, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import {
  externalParty,
  externalPartyCredential,
  externalPartyCredentialKindEnum,
  externalPartyCredentialStatusEnum,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit";
import { assertExternalPartyInOrg } from "../assertOrgScoped";
import { protectedMutation, protectedProcedure, router } from "../init";
import { orgScope } from "../schemas/orgScope";

const credentialKinds = externalPartyCredentialKindEnum.enumValues as [string, ...string[]];
const credentialStatuses = externalPartyCredentialStatusEnum.enumValues as [string, ...string[]];

export const externalPartyRouter = router({
  listOrgCredentialsDueSoon: protectedProcedure
    .input(
      orgScope.extend({
        withinDays: z.number().int().min(1).max(365).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.EXTERNAL_PARTY_READ,
      );
      const days = input.withinDays ?? 30;
      const now = new Date();
      const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      return ctx.db
        .select({
          credential: externalPartyCredential,
          party: externalParty,
        })
        .from(externalPartyCredential)
        .innerJoin(externalParty, eq(externalPartyCredential.externalPartyId, externalParty.id))
        .where(
          and(
            eq(externalPartyCredential.organizationId, input.organizationId),
            isNotNull(externalPartyCredential.validTo),
            gte(externalPartyCredential.validTo, now),
            lte(externalPartyCredential.validTo, horizon),
            inArray(externalPartyCredential.status, ["active", "pending_review"]),
          ),
        )
        .orderBy(asc(externalPartyCredential.validTo));
    }),

  /** Renewal queue: expired + due-soon credentials for PortCo contractor wedge. */
  listRenewalQueue: protectedProcedure
    .input(
      orgScope.extend({
        withinDays: z.number().int().min(1).max(365).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.EXTERNAL_PARTY_READ,
      );
      const days = input.withinDays ?? 30;
      const now = new Date();
      const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const rows = await ctx.db
        .select({
          credential: externalPartyCredential,
          party: externalParty,
        })
        .from(externalPartyCredential)
        .innerJoin(externalParty, eq(externalPartyCredential.externalPartyId, externalParty.id))
        .where(
          and(
            eq(externalPartyCredential.organizationId, input.organizationId),
            isNotNull(externalPartyCredential.validTo),
            inArray(externalPartyCredential.status, ["active", "pending_review", "expired"]),
          ),
        )
        .orderBy(asc(externalPartyCredential.validTo));

      return rows
        .filter((r) => {
          const vt = r.credential.validTo;
          if (!vt) return false;
          return vt <= horizon;
        })
        .map((r) => {
          const vt = r.credential.validTo!;
          const expired = vt < now;
          const daysUntil = Math.ceil((vt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          return {
            credentialId: r.credential.id,
            externalPartyId: r.party.id,
            companyName: r.party.companyName,
            kind: r.credential.kind,
            identifier: r.credential.identifier,
            validTo: vt.toISOString(),
            status: r.credential.status,
            queueStatus: expired ? ("expired" as const) : ("due_soon" as const),
            daysUntilExpiry: daysUntil,
          };
        });
    }),

  portfolioComplianceSummary: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.EXTERNAL_PARTY_READ,
    );
    const now = new Date();
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const creds = await ctx.db
      .select({ validTo: externalPartyCredential.validTo, status: externalPartyCredential.status })
      .from(externalPartyCredential)
      .where(eq(externalPartyCredential.organizationId, input.organizationId));

    let expired = 0;
    let dueSoon = 0;
    let active = 0;
    for (const c of creds) {
      if (c.status === "rejected") continue;
      if (c.validTo && c.validTo < now) expired += 1;
      else if (c.validTo && c.validTo <= horizon) dueSoon += 1;
      else active += 1;
    }

    const [partyCount] = await ctx.db
      .select({ n: count() })
      .from(externalParty)
      .where(eq(externalParty.organizationId, input.organizationId));

    return {
      externalPartyCount: Number(partyCount?.n ?? 0),
      credentialsExpired: expired,
      credentialsDueSoon30d: dueSoon,
      credentialsActive: active,
    };
  }),

  listCredentials: protectedProcedure
    .input(orgScope.extend({ externalPartyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.EXTERNAL_PARTY_READ,
      );
      await assertExternalPartyInOrg(ctx.db, input.organizationId, input.externalPartyId);
      return ctx.db
        .select()
        .from(externalPartyCredential)
        .where(
          and(
            eq(externalPartyCredential.organizationId, input.organizationId),
            eq(externalPartyCredential.externalPartyId, input.externalPartyId),
          ),
        )
        .orderBy(desc(externalPartyCredential.createdAt));
    }),

  createCredential: protectedMutation
    .input(
      orgScope.extend({
        externalPartyId: z.string().uuid(),
        kind: z.enum(credentialKinds),
        identifier: z.string().max(512).optional(),
        validFrom: z.coerce.date().optional(),
        validTo: z.coerce.date().optional(),
        evidenceUri: z.string().max(2048).optional().nullable(),
        notes: z.string().max(20_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.EXTERNAL_PARTY_WRITE,
      );
      await assertExternalPartyInOrg(ctx.db, input.organizationId, input.externalPartyId);

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(externalPartyCredential)
          .values({
            organizationId: input.organizationId,
            externalPartyId: input.externalPartyId,
            kind: input.kind as (typeof externalPartyCredentialKindEnum.enumValues)[number],
            identifier: input.identifier ?? null,
            validFrom: input.validFrom ?? null,
            validTo: input.validTo ?? null,
            evidenceUri:
              input.evidenceUri === undefined || input.evidenceUri === null || input.evidenceUri === ""
                ? null
                : input.evidenceUri.trim(),
            notes: input.notes ?? null,
          })
          .returning();
        if (row) {
          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "external_party_credential.create",
            entityType: "external_party_credential",
            entityId: row.id,
            payload: { externalPartyId: input.externalPartyId, kind: input.kind },
          });
        }
        return row;
      });
    }),

  updateCredential: protectedMutation
    .input(
      orgScope.extend({
        credentialId: z.string().uuid(),
        status: z.enum(credentialStatuses).optional(),
        identifier: z.string().max(512).optional().nullable(),
        validFrom: z.coerce.date().optional().nullable(),
        validTo: z.coerce.date().optional().nullable(),
        evidenceUri: z.string().max(2048).optional().nullable().or(z.literal("")),
        notes: z.string().max(20_000).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.EXTERNAL_PARTY_WRITE,
      );

      const [existing] = await ctx.db
        .select()
        .from(externalPartyCredential)
        .where(
          and(
            eq(externalPartyCredential.id, input.credentialId),
            eq(externalPartyCredential.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Credential not found." });
      }

      return ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .update(externalPartyCredential)
          .set({
            ...(input.status !== undefined
              ? {
                  status: input.status as (typeof externalPartyCredentialStatusEnum.enumValues)[number],
                }
              : {}),
            ...(input.identifier !== undefined ? { identifier: input.identifier } : {}),
            ...(input.validFrom !== undefined ? { validFrom: input.validFrom } : {}),
            ...(input.validTo !== undefined ? { validTo: input.validTo } : {}),
            ...(input.evidenceUri !== undefined
              ? {
                  evidenceUri:
                    input.evidenceUri === "" || input.evidenceUri === null
                      ? null
                      : input.evidenceUri,
                }
              : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            updatedAt: new Date(),
          })
          .where(eq(externalPartyCredential.id, input.credentialId))
          .returning();

        if (row) {
          await writeAuditLog(tx, {
            organizationId: input.organizationId,
            actorUserId: ctx.user.id,
            action: "external_party_credential.update",
            entityType: "external_party_credential",
            entityId: row.id,
            payload: { patch: { status: input.status } },
          });
        }
        return row;
      });
    }),

  getParty: protectedProcedure
    .input(orgScope.extend({ externalPartyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.EXTERNAL_PARTY_READ,
      );
      const [party] = await ctx.db
        .select()
        .from(externalParty)
        .where(
          and(
            eq(externalParty.id, input.externalPartyId),
            eq(externalParty.organizationId, input.organizationId),
          ),
        )
        .limit(1);
      if (!party) {
        throw new TRPCError({ code: "NOT_FOUND", message: "External party not found." });
      }
      return party;
    }),
});
