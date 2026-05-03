import { describe, expect, it, vi, beforeEach } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import { PERMISSIONS } from "@/lib/rbac";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import { environmentalRegulatoryPermit, riskAssessment } from "@/server/db/schema";
import { createListEntityFakeDb, createRbacOnlyFakeDb } from "../../helpers/fake-db";

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

describe("environmentalRegulatoryPermit.list", () => {
  it("is FORBIDDEN when RBAC chain has no grants", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "environmentalRegulatoryPermit.list",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: false,
            entityTable: environmentalRegulatoryPermit,
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
      message: `Missing permission: ${PERMISSIONS.ENVIRONMENTAL_PERMIT_READ}`,
    });
  });

  it("BAD_REQUEST when organizationId is not a valid UUID", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "environmentalRegulatoryPermit.list",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: true,
            entityTable: environmentalRegulatoryPermit,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({ organizationId: "x" }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns permits when RBAC succeeds", async () => {
    const rows = [
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        organizationId: orgId,
        siteId: null,
        title: "NPDES demo",
        permitIdentifier: "NP-001",
        agency: "EPA",
        jurisdiction: null,
        media: "water" as const,
        status: "active" as const,
        issuedAt: null,
        effectiveFrom: null,
        expiresAt: new Date("2027-01-01"),
        legalCitations: null,
        limits: null,
        complianceObligationId: null,
        ownerUserId: null,
        retainUntil: null,
        legalHold: false,
        anonymizedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "environmentalRegulatoryPermit.list",
      ctx: ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: environmentalRegulatoryPermit,
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

describe("planning.risk.list", () => {
  it("returns assessments when RBAC succeeds", async () => {
    const rows = [
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        organizationId: orgId,
        siteId: null,
        hazardId: null,
        summaryTitle: "Tank entry",
        assessmentKind: "task_based" as const,
        status: "active" as const,
        reviewDueAt: null,
        context: "Maintenance entry scenario for unit test roster.",
        existingControls: null,
        inherentRating: null,
        likelihoodScore: null,
        consequenceScore: null,
        residualRating: "medium" as const,
        assessedByUserId: userId,
        assessedAt: new Date(),
        retainUntil: null,
        legalHold: false,
        anonymizedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "planning.risk.list",
      ctx: ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: riskAssessment,
          listRows: rows,
        }),
        authenticatedSession(),
      ),
      type: "query",
      getRawInput: async () => ({
        organizationId: orgId,
        assessmentKind: "task_based",
      }),
      signal: testAbortSignal,
      batchIndex: 0,
    });
    expect(out).toEqual(rows);
  });
});

describe("planning.risk.create validation", () => {
  it("BAD_REQUEST when task_based has no steps", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "planning.risk.create",
        ctx: ctxWith(createRbacOnlyFakeDb(true), authenticatedSession()),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          assessmentKind: "task_based",
          context: "at least ten chars for validation path",
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Task-based assessments require at least one step.",
    });
  });

  it("BAD_REQUEST when site_based has no siteId", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "planning.risk.create",
        ctx: ctxWith(createRbacOnlyFakeDb(true), authenticatedSession()),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          assessmentKind: "site_based",
          context: "at least ten chars for validation path",
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Site-based assessments require siteId.",
    });
  });
});
