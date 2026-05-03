import { describe, expect, it } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import { PERMISSIONS } from "@/lib/rbac";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import {
  createOrganizationContextSyncToggleFakeDb,
  createRbacOnlyFakeDb,
} from "../../helpers/fake-db";

const orgId = "00000000-0000-4000-8000-000000000001";
const userId = "test_user_org_ctx_sync";
const testAbortSignal = new AbortController().signal;

function ctxWith(db: TRPCContext["db"], session: TRPCContext["session"]): TRPCContext {
  return { db, session, ip: "127.0.0.1" };
}

function authenticatedSession(): NonNullable<TRPCContext["session"]> {
  return { user: { id: userId } } as NonNullable<TRPCContext["session"]>;
}

describe("organization.updateContextSyncEnabled", () => {
  it("is FORBIDDEN without org admin", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "organization.updateContextSyncEnabled",
        ctx: ctxWith(createRbacOnlyFakeDb(false), authenticatedSession()),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          enabled: false,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: `Missing permission: ${PERMISSIONS.ORG_ADMIN}`,
    });
  });

  it("runs transactional update and audit for org admins", async () => {
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "organization.updateContextSyncEnabled",
      ctx: ctxWith(createOrganizationContextSyncToggleFakeDb(true), authenticatedSession()),
      type: "mutation",
      getRawInput: async () => ({
        organizationId: orgId,
        enabled: true,
      }),
      signal: testAbortSignal,
      batchIndex: 0,
    });
    expect(out).toEqual({ ok: true });
  });
});
