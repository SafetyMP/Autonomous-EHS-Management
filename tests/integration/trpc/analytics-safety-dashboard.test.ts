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

async function safetyDashboard(ctx: TRPCContext, trailingMonths?: number) {
  return callTRPCProcedure({
    router: appRouter,
    path: "analytics.safetyDashboard",
    ctx,
    type: "query",
    getRawInput: async () => ({
      organizationId: orgId,
      ...(trailingMonths !== undefined ? { trailingMonths } : {}),
    }),
    signal: testAbortSignal,
    batchIndex: 0,
  });
}

describe("analytics.safetyDashboard", () => {
  it("UNAUTHORIZED without session", async () => {
    await expect(
      safetyDashboard(ctxWith(createAnalyticsNoPermissionFakeDb(), null)),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("FORBIDDEN when user is not an org member", async () => {
    await expect(
      safetyDashboard(ctxWith(createAnalyticsNonMemberFakeDb(), authenticatedSession())),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Not a member of this organization.",
    });
  });

  it("returns null sections when caller has membership but no read permissions", async () => {
    const out = await safetyDashboard(
      ctxWith(createAnalyticsNoPermissionFakeDb(), authenticatedSession()),
    );
    expect(out.glossaryVersion).toBe(1);
    expect(out.incidents).toBeNull();
    expect(out.capas).toBeNull();
    expect(out.training).toBeNull();
    expect(out.auditFindings).toBeNull();
    expect(out.environment).toBeNull();
    expect(typeof out.generatedAt).toBe("string");
  });

  it("accepts trailingMonths within Zod bounds", async () => {
    const out = await safetyDashboard(
      ctxWith(createAnalyticsNoPermissionFakeDb(), authenticatedSession()),
      6,
    );
    expect(out.glossaryVersion).toBe(1);
  });
});
