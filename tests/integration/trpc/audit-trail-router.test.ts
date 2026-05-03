import { describe, expect, it, beforeEach, vi } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import * as audit from "@/server/services/audit";
import { PERMISSIONS } from "@/lib/rbac";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import {
  createAuditTrailListFakeDb,
  createRbacOnlyFakeDb,
} from "../../helpers/fake-db";

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
  vi.restoreAllMocks();
});

describe("compliance.auditTrail.list", () => {
  it("is FORBIDDEN when RBAC denies audit_trail:read", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.auditTrail.list",
        ctx: ctxWith(createRbacOnlyFakeDb(false), authenticatedSession()),
        type: "query",
        getRawInput: async () => ({ organizationId: orgId }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: `Missing permission: ${PERMISSIONS.AUDIT_TRAIL_READ}`,
    });
  });

  it("BAD_REQUEST when organizationId is not a valid UUID", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.auditTrail.list",
        ctx: ctxWith(
          createAuditTrailListFakeDb({ rbacHit: true, listRows: [] }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({ organizationId: "not-a-uuid" }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("BAD_REQUEST when limit exceeds 100", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.auditTrail.list",
        ctx: ctxWith(
          createAuditTrailListFakeDb({ rbacHit: true, listRows: [] }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({ organizationId: orgId, limit: 101 }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("BAD_REQUEST when cursor.createdAt is not a parseable date", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.auditTrail.list",
        ctx: ctxWith(
          createAuditTrailListFakeDb({ rbacHit: true, listRows: [] }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
          cursor: { createdAt: "invalid-date", id: "11111111-1111-4111-8111-111111111111" },
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "cursor.createdAt must be a valid ISO date string.",
    });
  });

  it("returns mapped rows and null nextCursor when page is exhausted", async () => {
    const createdAt = new Date("2025-06-15T12:00:00.000Z");
    const fakeRow = {
      id: "22222222-2222-4222-8222-222222222222",
      organizationId: orgId,
      actorUserId: userId,
      action: "incident.create",
      entityType: "incident",
      entityId: "33333333-3333-4333-8333-333333333333",
      payload: { title: "x" },
      createdAt,
      actorName: "Test User",
      actorEmail: "test@example.com",
    };

    const out = await callTRPCProcedure({
      router: appRouter,
      path: "compliance.auditTrail.list",
      ctx: ctxWith(
        createAuditTrailListFakeDb({ rbacHit: true, listRows: [fakeRow] }),
        authenticatedSession(),
      ),
      type: "query",
      getRawInput: async () => ({ organizationId: orgId, limit: 50 }),
      signal: testAbortSignal,
      batchIndex: 0,
    });

    expect(out).toEqual({
      items: [
        {
          id: fakeRow.id,
          organizationId: orgId,
          actorUserId: userId,
          action: "incident.create",
          entityType: "incident",
          entityId: fakeRow.entityId,
          payload: { title: "x" },
          createdAt: createdAt.toISOString(),
          actorName: "Test User",
          actorEmail: "test@example.com",
        },
      ],
      nextCursor: null,
    });
  });

  it("returns nextCursor when more rows remain (limit boundary)", async () => {
    const ids = [
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
    ];
    const rows = ids.map((id, i) => ({
      id,
      organizationId: orgId,
      actorUserId: null as string | null,
      action: "test.action",
      entityType: "test_entity",
      entityId: `ent-${i}`,
      payload: null as Record<string, unknown> | null,
      createdAt: new Date(Date.UTC(2025, 0, 10 - i)),
      actorName: null as string | null,
      actorEmail: null as string | null,
    }));

    const out = (await callTRPCProcedure({
      router: appRouter,
      path: "compliance.auditTrail.list",
      ctx: ctxWith(
        createAuditTrailListFakeDb({ rbacHit: true, listRows: rows }),
        authenticatedSession(),
      ),
      type: "query",
      getRawInput: async () => ({ organizationId: orgId, limit: 2 }),
      signal: testAbortSignal,
      batchIndex: 0,
    })) as {
      items: unknown[];
      nextCursor: { createdAt: string; id: string } | null;
    };

    expect(out.nextCursor).toEqual({
      createdAt: rows[1]!.createdAt.toISOString(),
      id: rows[1]!.id,
    });
    expect(out.items).toHaveLength(2);
  });
});

describe("compliance.auditTrail.exportCsv", () => {
  it("is FORBIDDEN when RBAC denies audit_trail:read", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.auditTrail.exportCsv",
        ctx: ctxWith(createRbacOnlyFakeDb(false), authenticatedSession()),
        type: "query",
        getRawInput: async () => ({ organizationId: orgId }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: `Missing permission: ${PERMISSIONS.AUDIT_TRAIL_READ}`,
    });
  });

  it("BAD_REQUEST when limit exceeds 5000", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.auditTrail.exportCsv",
        ctx: ctxWith(
          createAuditTrailListFakeDb({ rbacHit: true, listRows: [] }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({ organizationId: orgId, limit: 5001 }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns CSV and rowCount; writes audit_log export row", async () => {
    vi.spyOn(audit, "writeAuditLog").mockResolvedValue(undefined);
    const createdAt = new Date("2025-06-15T12:00:00.000Z");
    const fakeRow = {
      id: "22222222-2222-4222-8222-222222222222",
      organizationId: orgId,
      actorUserId: userId,
      action: "incident.create",
      entityType: "incident",
      entityId: "33333333-3333-4333-8333-333333333333",
      payload: { title: "x" },
      createdAt,
      actorName: "Test User",
      actorEmail: "test@example.com",
    };

    const out = await callTRPCProcedure({
      router: appRouter,
      path: "compliance.auditTrail.exportCsv",
      ctx: ctxWith(
        createAuditTrailListFakeDb({ rbacHit: true, listRows: [fakeRow] }),
        authenticatedSession(),
      ),
      type: "query",
      getRawInput: async () => ({ organizationId: orgId, limit: 100 }),
      signal: testAbortSignal,
      batchIndex: 0,
    });

    expect(out.rowCount).toBe(1);
    expect(out.limit).toBe(100);
    expect(out.csv).toContain("incident.create");
    expect(out.csv).toContain(fakeRow.id);
    expect(audit.writeAuditLog).toHaveBeenCalledTimes(1);
  });
});
