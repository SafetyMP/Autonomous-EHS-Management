import { describe, expect, it } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import {
  createAnalyticsNoPermissionFakeDb,
  createAnalyticsNonMemberFakeDb,
} from "../../helpers/fake-db";

const orgId = "00000000-0000-4000-8000-000000000001";
const userId = "test_user_stable_id";
const testAbortSignal = new AbortController().signal;

function ctxWith(db: TRPCContext["db"], session: TRPCContext["session"]): TRPCContext {
  return { db, session, ip: "127.0.0.1" };
}

function authenticatedSession(): NonNullable<TRPCContext["session"]> {
  return {
    user: { id: userId },
  } as NonNullable<TRPCContext["session"]>;
}

describe("analytics.observationFollowUpSla", () => {
  it("FORBIDDEN when user is not an org member", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "analytics.observationFollowUpSla",
        ctx: ctxWith(createAnalyticsNonMemberFakeDb(), authenticatedSession()),
        type: "query",
        getRawInput: async () => ({ organizationId: orgId }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Not a member of this organization.",
    });
  });

  it("returns null when caller lacks safety_observation read", async () => {
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "analytics.observationFollowUpSla",
      ctx: ctxWith(createAnalyticsNoPermissionFakeDb(), authenticatedSession()),
      type: "query",
      getRawInput: async () => ({ organizationId: orgId }),
      signal: testAbortSignal,
      batchIndex: 0,
    });
    expect(out).toBeNull();
  });
});
