import { describe, expect, it, vi, beforeEach } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import { PERMISSIONS } from "@/lib/rbac";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import type { Db } from "@/server/db";
import { complianceMetricSnapshot, establishment, membership } from "@/server/db/schema";
import { createListEntityFakeDb } from "../../helpers/fake-db";

type RbacRow = Record<string, unknown>;

function rbacMembershipFrom(rows: RbacRow[]) {
  const limitResolved = Promise.resolve(rows);
  return {
    innerJoin() {
      return {
        innerJoin() {
          return {
            where() {
              return {
                limit(): Promise<RbacRow[]> {
                  return limitResolved;
                },
              };
            },
          };
        },
      };
    },
  };
}

function createEstablishmentGateFakeDb(opts: { rbacHit: boolean; establishmentRows: RbacRow[] }): Db {
  const rbacRows = opts.rbacHit ? ([{ pk: "grant" }] as RbacRow[]) : ([] as RbacRow[]);
  const resolved = Promise.resolve(opts.establishmentRows);
  return {
    select() {
      return {
        from(table: unknown) {
          if (table === membership) {
            return rbacMembershipFrom(rbacRows as RbacRow[]);
          }
          if (table === establishment) {
            return {
              where() {
                return {
                  limit() {
                    return resolved;
                  },
                };
              },
            };
          }
          throw new Error(`[establishment-gate fake] unsupported from(${String(table)})`);
        },
      };
    },
  } as unknown as Db;
}

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

describe("compliance.metrics.listTrirSnapshots", () => {
  it("is FORBIDDEN when RBAC chain has no grants", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.metrics.listTrirSnapshots",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: false,
            entityTable: complianceMetricSnapshot,
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
      message: `Missing permission: ${PERMISSIONS.ESTABLISHMENT_READ}`,
    });
  });

  it("BAD_REQUEST when organizationId is not a valid UUID", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.metrics.listTrirSnapshots",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: true,
            entityTable: complianceMetricSnapshot,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({ organizationId: "nope" }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("BAD_REQUEST when calendarYear is below schema minimum", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.metrics.listTrirSnapshots",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: true,
            entityTable: complianceMetricSnapshot,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
          calendarYear: 1999,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("BAD_REQUEST when limit exceeds schema maximum", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.metrics.listTrirSnapshots",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: true,
            entityTable: complianceMetricSnapshot,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
          limit: 101,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns rows when RBAC succeeds", async () => {
    const rows = [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        organizationId: orgId,
        establishmentId: null,
        metricKey: "trir",
        calendarYear: 2026,
        formulaVersion: 1,
        inputsHash: "abc123",
        inputsJson: {},
        resultJson: { trir: 1.5 },
        computedByUserId: userId,
        createdAt: new Date(),
      },
    ];
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "compliance.metrics.listTrirSnapshots",
      ctx: ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: complianceMetricSnapshot,
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

describe("compliance.metrics.computeTrirSnapshot", () => {
  it("BAD_REQUEST when calendarYear is below schema minimum", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.metrics.computeTrirSnapshot",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: true,
            entityTable: complianceMetricSnapshot,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          calendarYear: 1999,
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
        path: "compliance.metrics.computeTrirSnapshot",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: false,
            entityTable: complianceMetricSnapshot,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          calendarYear: 2026,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: `Missing permission: ${PERMISSIONS.ESTABLISHMENT_READ}`,
    });
  });

  it("BAD_REQUEST when establishmentId is not in the organization", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.metrics.computeTrirSnapshot",
        ctx: ctxWith(
          createEstablishmentGateFakeDb({ rbacHit: true, establishmentRows: [] }),
          authenticatedSession(),
        ),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          calendarYear: 2026,
          establishmentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Establishment not found in this organization.",
    });
  });
});

describe("compliance.metrics.recordableInvestigationThemes", () => {
  it("BAD_REQUEST when organizationId is not a valid UUID", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.metrics.recordableInvestigationThemes",
        ctx: ctxWith(
          createEstablishmentGateFakeDb({ rbacHit: true, establishmentRows: [] }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: "nope",
          calendarYear: 2026,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("BAD_REQUEST when calendarYear is below schema minimum", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.metrics.recordableInvestigationThemes",
        ctx: ctxWith(
          createEstablishmentGateFakeDb({ rbacHit: true, establishmentRows: [] }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
          calendarYear: 1999,
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
        path: "compliance.metrics.recordableInvestigationThemes",
        ctx: ctxWith(
          createEstablishmentGateFakeDb({ rbacHit: false, establishmentRows: [] }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
          calendarYear: 2026,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: `Missing permission: ${PERMISSIONS.ESTABLISHMENT_READ}`,
    });
  });

  it("BAD_REQUEST when establishmentId is not in the organization", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.metrics.recordableInvestigationThemes",
        ctx: ctxWith(
          createEstablishmentGateFakeDb({ rbacHit: true, establishmentRows: [] }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
          calendarYear: 2026,
          establishmentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Establishment not found in this organization.",
    });
  });
});
