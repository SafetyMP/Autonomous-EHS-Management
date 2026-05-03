import { describe, expect, it, vi, beforeEach } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import { PERMISSIONS } from "@/lib/rbac";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import { safetyObservation } from "@/server/db/schema";
import { createListEntityFakeDb, createObservationLinkCapaFakeDb } from "../../helpers/fake-db";

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

describe("observation.list", () => {
  it("is FORBIDDEN when RBAC chain has no grants", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "observation.list",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: false,
            entityTable: safetyObservation,
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
      message: `Missing permission: ${PERMISSIONS.SAFETY_OBSERVATION_READ}`,
    });
  });

  it("BAD_REQUEST when organizationId is not a valid UUID", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "observation.list",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: true,
            entityTable: safetyObservation,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({ organizationId: "not-a-uuid" }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns rows when RBAC succeeds", async () => {
    const rows = [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        organizationId: orgId,
        siteId: null,
        observedAt: new Date("2026-03-02T12:00:00Z"),
        category: "unsafe_condition" as const,
        severity: "medium" as const,
        summary: "Clutter blocking exit",
        details: null,
        status: "open" as const,
        reporterUserId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        linkedCorrectiveActionId: null,
        assigneeUserId: null,
        followUpDueAt: null,
      },
    ];
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "observation.list",
      ctx: ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: safetyObservation,
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

describe("observation.listEscalations", () => {
  it("is FORBIDDEN when RBAC chain has no grants", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "observation.listEscalations",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: false,
            entityTable: safetyObservation,
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
      message: `Missing permission: ${PERMISSIONS.SAFETY_OBSERVATION_READ}`,
    });
  });

  it("BAD_REQUEST when observationId is present but not a valid UUID", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "observation.listEscalations",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: true,
            entityTable: safetyObservation,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
          observationId: "not-a-valid-uuid",
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("observation.linkToCapa", () => {
  const observationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const capaId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const observationRow = {
    id: observationId,
    organizationId: orgId,
    siteId: null,
    observedAt: new Date("2026-03-02T12:00:00Z"),
    category: "unsafe_condition" as const,
    severity: "medium" as const,
    summary: "Clutter blocking exit",
    details: null,
    status: "open" as const,
    reporterUserId: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    linkedCorrectiveActionId: null,
    assigneeUserId: null,
    followUpDueAt: null,
  };
  const capaRow = {
    id: capaId,
    organizationId: orgId,
    title: "Fix exit",
    status: "planned" as const,
  };

  it("is FORBIDDEN when user lacks capa:read despite safety_observation:update grant", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "observation.linkToCapa",
        ctx: ctxWith(
          createObservationLinkCapaFakeDb({
            capaReadGranted: false,
            observation: observationRow,
            capa: capaRow,
          }),
          authenticatedSession(),
        ),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          observationId,
          correctiveActionId: capaId,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: `Missing permission: ${PERMISSIONS.CAPA_READ}`,
    });
  });

  it("returns updated observation when both permissions are granted", async () => {
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "observation.linkToCapa",
      ctx: ctxWith(
        createObservationLinkCapaFakeDb({
          capaReadGranted: true,
          observation: observationRow,
          capa: capaRow,
        }),
        authenticatedSession(),
      ),
      type: "mutation",
      getRawInput: async () => ({
        organizationId: orgId,
        observationId,
        correctiveActionId: capaId,
      }),
      signal: testAbortSignal,
      batchIndex: 0,
    });
    expect(out).toMatchObject({
      linkedCorrectiveActionId: capaId,
      status: "acknowledged",
    });
  });
});
