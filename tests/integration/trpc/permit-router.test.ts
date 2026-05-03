import { describe, expect, it, vi, beforeEach } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import { PERMISSIONS } from "@/lib/rbac";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import { workPermit } from "@/server/db/schema";
import { createListEntityFakeDb } from "../../helpers/fake-db";

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

describe("permit.list", () => {
  it("is FORBIDDEN when RBAC chain has no grants", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "permit.list",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: false,
            entityTable: workPermit,
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
      message: `Missing permission: ${PERMISSIONS.WORK_PERMIT_READ}`,
    });
  });

  it("BAD_REQUEST when organizationId is not a valid UUID", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "permit.list",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: true,
            entityTable: workPermit,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({ organizationId: "bad-org-id" }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns permits when RBAC succeeds", async () => {
    const rows = [
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        organizationId: orgId,
        siteId: null,
        title: "Tank weld repair",
        permitType: "hot_work" as const,
        status: "draft" as const,
        requesterUserId: userId,
        validFrom: new Date("2026-03-02T08:00:00Z"),
        validTo: new Date("2026-03-02T17:00:00Z"),
        workSummary: "Welding patch on glycol tank.",
        hazardsControls: "Fire watch; extinguishers at line.",
        approvedByUserId: null,
        approvedAt: null,
        completedAt: null,
        cancelReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "permit.list",
      ctx: ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: workPermit,
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

describe("permit.get", () => {
  const permitId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

  it("BAD_REQUEST when permitId is not a valid UUID", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "permit.get",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: true,
            entityTable: workPermit,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
          permitId: "invalid",
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("is FORBIDDEN when RBAC chain has no grants (after valid input)", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "permit.get",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: false,
            entityTable: workPermit,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
          permitId,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: `Missing permission: ${PERMISSIONS.WORK_PERMIT_READ}`,
    });
  });
});
