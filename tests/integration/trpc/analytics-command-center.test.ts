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

async function commandCenter(ctx: TRPCContext) {
  return callTRPCProcedure({
    router: appRouter,
    path: "analytics.commandCenter",
    ctx,
    type: "query",
    getRawInput: async () => ({ organizationId: orgId }),
    signal: testAbortSignal,
    batchIndex: 0,
  });
}

describe("analytics.commandCenter", () => {
  it("UNAUTHORIZED without session", async () => {
    await expect(
      commandCenter(ctxWith(createAnalyticsNoPermissionFakeDb(), null)),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("FORBIDDEN when user is not an org member", async () => {
    await expect(
      commandCenter(ctxWith(createAnalyticsNonMemberFakeDb(), authenticatedSession())),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Not a member of this organization.",
    });
  });

  it("returns null KPI blocks and empty feed without read permissions", async () => {
    const out = await commandCenter(ctxWith(createAnalyticsNoPermissionFakeDb(), authenticatedSession()));
    expect(out.kpis.incidents).toBeNull();
    expect(out.kpis.capas).toBeNull();
    expect(out.kpis.environment).toBeNull();
    expect(out.kpis.fieldOperations).toBeNull();
    expect(out.kpis.approvalsInbox).toBeNull();
    expect(out.kpis.inspections).toBeNull();
    expect(out.kpis.tasksWorkbench).toBeNull();
    expect(out.kpis.auditFindings).toBeNull();
    expect(out.kpis.riskProgram).toBeNull();
    expect(out.kpis.environmentalPermits).toBeNull();
    expect(out.kpis.programAutomation.observationFollowUpEscalationsRecorded90d).toBeNull();
    expect(out.kpis.programAutomation.approvalSlaEscalationsRecorded90d).toBeNull();
    expect(out.kpis.cronHealth).toBeNull();
    expect(Array.isArray(out.activityFeed)).toBe(true);
    expect(out.activityFeed.length).toBe(0);
    expect(typeof out.generatedAt).toBe("string");
  });

  it("respects bounded feed limits in input validation", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "analytics.commandCenter",
        ctx: ctxWith(createAnalyticsNoPermissionFakeDb(), authenticatedSession()),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
          feedTotalMax: 99,
          feedLimitPerType: 44,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
