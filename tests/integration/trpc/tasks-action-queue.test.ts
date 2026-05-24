import { describe, expect, it, vi, beforeEach } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import { createRbacOnlyFakeDb } from "../../helpers/fake-db";

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

describe("tasks.actionQueue", () => {
  it("is FORBIDDEN when RBAC denies tasks:read", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "tasks.actionQueue",
        ctx: ctxWith(createRbacOnlyFakeDb(false), authenticatedSession()),
        type: "query",
        getRawInput: async () => ({ organizationId: orgId }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("tasks.actionQueueCounts", () => {
  it("is FORBIDDEN when RBAC denies tasks:read", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "tasks.actionQueueCounts",
        ctx: ctxWith(createRbacOnlyFakeDb(false), authenticatedSession()),
        type: "query",
        getRawInput: async () => ({ organizationId: orgId }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
