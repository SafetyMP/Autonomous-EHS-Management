import { describe, expect, it, beforeEach, vi } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import { PERMISSIONS } from "@/lib/rbac";
import { contextSyncAgentClassClaim } from "@/server/db/schema";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import { createListEntityFakeDb } from "../../helpers/fake-db";

const orgId = "00000000-0000-4000-8000-000000000001";
const userId = "test_user_ctx_proto";
const testAbortSignal = new AbortController().signal;

function ctxWith(db: TRPCContext["db"], session: TRPCContext["session"]): TRPCContext {
  return { db, session, ip: "127.0.0.1" };
}

function authenticatedSession(): NonNullable<TRPCContext["session"]> {
  return { user: { id: userId } } as NonNullable<TRPCContext["session"]>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("contextSyncProtocol.agentClassClaimsList", () => {
  it("is FORBIDDEN without org admin", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "contextSyncProtocol.agentClassClaimsList",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: false,
            entityTable: contextSyncAgentClassClaim,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({ organizationId: orgId }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: `Missing permission: ${PERMISSIONS.ORG_ADMIN}`,
    });
  });

  it("is FORBIDDEN when Context Sync is disabled for the organization", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "contextSyncProtocol.agentClassClaimsList",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: true,
            entityTable: contextSyncAgentClassClaim,
            listRows: [],
            contextSyncOrgEnabled: false,
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({ organizationId: orgId }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringMatching(/Context Sync is not enabled/i),
    });
  });

  it("returns claim rows for org admins", async () => {
    const rows = [
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        organizationId: orgId,
        userId,
        agentClass: "ide-agent",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    ];
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "contextSyncProtocol.agentClassClaimsList",
      ctx: ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: contextSyncAgentClassClaim,
          listRows: rows,
        }),
        authenticatedSession(),
      ),
      type: "query",
      getRawInput: async () => ({ organizationId: orgId }),
      signal: testAbortSignal,
      batchIndex: 0,
    });
    expect(out).toEqual(rows);
  });
});
