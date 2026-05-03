import { describe, expect, it, vi, beforeEach } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import { approvalRequest } from "@/server/db/schema";
import { createListEntityFakeDb } from "../../helpers/fake-db";

vi.mock("@/server/services/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const orgId = "00000000-0000-4000-8000-000000000001";
const userId = "test_user_stable_id";
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

describe("approval.listOpenCapaRequests", () => {
  it("is FORBIDDEN when RBAC denies CAPA read", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "approval.listOpenCapaRequests",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: false,
            entityTable: approvalRequest,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({ organizationId: orgId }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns open CAPA approval requests when RBAC succeeds", async () => {
    const rows = [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        organizationId: orgId,
        entityType: "capa",
        entityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        status: "open",
        createdByUserId: userId,
        resolvedAt: null,
        createdAt: new Date("2026-01-15T12:00:00Z"),
        updatedAt: new Date("2026-01-15T12:00:00Z"),
      },
    ];
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "approval.listOpenCapaRequests",
      ctx: ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: approvalRequest,
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
