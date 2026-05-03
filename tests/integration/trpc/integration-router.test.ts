import { describe, expect, it, vi, beforeEach } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import * as audit from "@/server/services/audit";
import { PERMISSIONS } from "@/lib/rbac";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import { integrationEvent } from "@/server/db/schema";
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

describe("integration.listEvents", () => {
  it("is FORBIDDEN when RBAC chain has no grants", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "integration.listEvents",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: false,
            entityTable: integrationEvent,
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
      message: `Missing permission: ${PERMISSIONS.INTEGRATION_READ}`,
    });
  });

  it("BAD_REQUEST when organizationId is not a valid UUID", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "integration.listEvents",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: true,
            entityTable: integrationEvent,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({ organizationId: "" }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns rows when RBAC succeeds", async () => {
    const rows = [
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        organizationId: orgId,
        eventType: "training.completion",
        payload: {},
        processingStatus: "applied" as const,
        processingError: null,
        appliedAt: new Date(),
        createdAt: new Date(),
      },
    ];
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "integration.listEvents",
      ctx: ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: integrationEvent,
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

describe("integration.failedEventsHealth", () => {
  it("is FORBIDDEN when RBAC chain has no grants", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "integration.failedEventsHealth",
        ctx: ctxWith(createRbacOnlyFakeDb(false), authenticatedSession()),
        type: "query",
        getRawInput: async () => ({ organizationId: orgId }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: `Missing permission: ${PERMISSIONS.INTEGRATION_READ}`,
    });
  });
});

describe("integration.enqueueTestEvent", () => {
  it("BAD_REQUEST when eventType is empty", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "integration.enqueueTestEvent",
        ctx: ctxWith(createRbacOnlyFakeDb(true), authenticatedSession()),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          eventType: "",
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("is FORBIDDEN when RBAC chain has no grants (with valid input)", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "integration.enqueueTestEvent",
        ctx: ctxWith(createRbacOnlyFakeDb(false), authenticatedSession()),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          eventType: "manual.probe",
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: `Missing permission: ${PERMISSIONS.INTEGRATION_WRITE}`,
    });
  });
});

describe("integration.ingestTrainingCompletion", () => {
  it("BAD_REQUEST when organizationId is not a valid UUID", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "integration.ingestTrainingCompletion",
        ctx: ctxWith(createRbacOnlyFakeDb(true), authenticatedSession()),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: "bad",
          externalWorkerId: "w",
          courseCode: "c",
          completedAt: new Date(),
          issuer: "i",
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("is FORBIDDEN when RBAC chain has no grants (with valid-shaped input)", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "integration.ingestTrainingCompletion",
        ctx: ctxWith(createRbacOnlyFakeDb(false), authenticatedSession()),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          externalWorkerId: "worker-1",
          courseCode: "HSE-101",
          completedAt: new Date(),
          issuer: "LMS",
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: `Missing permission: ${PERMISSIONS.INTEGRATION_WRITE}`,
    });
  });
});

describe("integration.exportEventsWarehouseSlice", () => {
  it("is FORBIDDEN when RBAC chain has no grants", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "integration.exportEventsWarehouseSlice",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: false,
            entityTable: integrationEvent,
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
      message: `Missing permission: ${PERMISSIONS.INTEGRATION_READ}`,
    });
  });

  it("returns NDJSON slice and audits export", async () => {
    const spy = vi.spyOn(audit, "writeAuditLog").mockResolvedValue(undefined);
    try {
      const createdAt = new Date("2026-03-02T12:00:00.000Z");
      const rows = [
        {
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          organizationId: orgId,
          eventType: "training_completion",
          payload: { stub: true },
          deliveredAt: null,
          processingStatus: "applied" as const,
          processingError: null,
          appliedAt: new Date("2026-03-02T13:00:00.000Z"),
          createdAt,
        },
      ];
      const out = await callTRPCProcedure({
        router: appRouter,
        path: "integration.exportEventsWarehouseSlice",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: true,
            entityTable: integrationEvent,
            listRows: rows,
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({ organizationId: orgId, limit: 500 }),
        signal: testAbortSignal,
        batchIndex: 0,
      });
      expect(out.rowCount).toBe(1);
      expect(out.body).toContain("\"eventType\":\"training_completion\"");
      const parsed = JSON.parse(out.body.split("\n")[0] ?? "{}") as { id?: string };
      expect(parsed.id).toBe("eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee");
      expect(spy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: "integration.export_events_warehouse",
          entityType: "organization",
          entityId: orgId,
        }),
      );
    } finally {
      spy.mockRestore();
    }
  });
});

describe("integration.reprocessFailedEvent", () => {
  it("BAD_REQUEST when eventId is not a valid UUID", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "integration.reprocessFailedEvent",
        ctx: ctxWith(createRbacOnlyFakeDb(true), authenticatedSession()),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          eventId: "not-uuid",
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("is FORBIDDEN when RBAC chain has no grants", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "integration.reprocessFailedEvent",
        ctx: ctxWith(createRbacOnlyFakeDb(false), authenticatedSession()),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          eventId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: `Missing permission: ${PERMISSIONS.INTEGRATION_WRITE}`,
    });
  });
});
