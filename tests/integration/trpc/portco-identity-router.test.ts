import { describe, expect, it, vi, beforeEach } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import * as audit from "@/server/services/audit";
import { PERMISSIONS } from "@/lib/rbac";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import { createRbacOnlyFakeDb } from "../../helpers/fake-db";
import { oidcJitClaimRule, scimGroupMapping } from "@/server/db/schema";
import type { Db } from "@/server/db";

const orgId = "00000000-0000-4000-8000-000000000001";
const userId = "test_user_stable_id";
const ruleId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const testAbortSignal = new AbortController().signal;

function ctxWith(db: TRPCContext["db"], session: TRPCContext["session"]): TRPCContext {
  return { db, session, ip: "127.0.0.1" };
}

function authenticatedSession(): NonNullable<TRPCContext["session"]> {
  return { user: { id: userId } } as NonNullable<TRPCContext["session"]>;
}

function createPortcoIdentityMutationFakeDb(opts: {
  rbacHit: boolean;
  table: typeof oidcJitClaimRule | typeof scimGroupMapping;
  returningRow: Record<string, unknown>;
}): Db {
  const rbacDb = createRbacOnlyFakeDb(opts.rbacHit);
  return {
    ...rbacDb,
    insert() {
      return {
        values() {
          return {
            returning: async () => [opts.returningRow],
          };
        },
      };
    },
    update() {
      return {
        set() {
          return {
            where() {
              return {
                returning: async () => [opts.returningRow],
              };
            },
          };
        },
      };
    },
    delete() {
      return {
        where: async () => undefined,
      };
    },
    select() {
      return {
        from(table: unknown) {
          if (table === opts.table) {
            return {
              where() {
                return {
                  limit: async () => [opts.returningRow],
                };
              },
            };
          }
          return (rbacDb as Db).select().from(table as never);
        },
      };
    },
  } as unknown as Db;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("portcoIdentity.upsertOidcJitRule", () => {
  it("is FORBIDDEN without org admin", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "portcoIdentity.upsertOidcJitRule",
        ctx: ctxWith(createRbacOnlyFakeDb(false), authenticatedSession()),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          matchValue: "ehs-managers",
          roleSlug: "supervisor",
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: `Missing permission: ${PERMISSIONS.ORG_ADMIN}`,
    });
  });

  it("writes audit log on create", async () => {
    const spy = vi.spyOn(audit, "writeAuditLog").mockResolvedValue(undefined);
    try {
      await callTRPCProcedure({
        router: appRouter,
        path: "portcoIdentity.upsertOidcJitRule",
        ctx: ctxWith(
          createPortcoIdentityMutationFakeDb({
            rbacHit: true,
            table: oidcJitClaimRule,
            returningRow: {
              id: ruleId,
              organizationId: orgId,
              claimKey: "groups",
              matchValue: "ehs-managers",
              roleSlug: "supervisor",
              priority: 100,
              enabled: true,
            },
          }),
          authenticatedSession(),
        ),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          matchValue: "ehs-managers",
          roleSlug: "supervisor",
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      });
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: "portco.oidc_jit_rule.create",
          entityType: "oidc_jit_claim_rule",
          entityId: ruleId,
        }),
      );
    } finally {
      spy.mockRestore();
    }
  });
});

describe("portcoIdentity.deleteScimGroupMapping", () => {
  it("writes audit log on delete", async () => {
    const mappingId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const spy = vi.spyOn(audit, "writeAuditLog").mockResolvedValue(undefined);
    try {
      await callTRPCProcedure({
        router: appRouter,
        path: "portcoIdentity.deleteScimGroupMapping",
        ctx: ctxWith(
          createPortcoIdentityMutationFakeDb({
            rbacHit: true,
            table: scimGroupMapping,
            returningRow: {
              id: mappingId,
              organizationId: orgId,
              idpGroupId: "grp-1",
              roleSlug: "supervisor",
            },
          }),
          authenticatedSession(),
        ),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          id: mappingId,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      });
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: "portco.scim_group_mapping.delete",
          entityType: "scim_group_mapping",
          entityId: mappingId,
        }),
      );
    } finally {
      spy.mockRestore();
    }
  });
});
