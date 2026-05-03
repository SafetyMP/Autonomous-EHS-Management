import { describe, expect, it, vi, beforeEach } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import { PERMISSIONS } from "@/lib/rbac";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import type { Db } from "@/server/db";
import {
  establishment,
  establishmentMonthMetrics,
  establishmentYearMetrics,
  membership,
} from "@/server/db/schema";

const orgId = "00000000-0000-4000-8000-000000000001";
const userId = "test_user_stable_id";
const estId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const testAbortSignal = new AbortController().signal;

function ctxWith(db: TRPCContext["db"], session: TRPCContext["session"]): TRPCContext {
  return { db, session, ip: "127.0.0.1" };
}

function authenticatedSession(): NonNullable<TRPCContext["session"]> {
  return { user: { id: userId } } as NonNullable<TRPCContext["session"]>;
}

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

function createMonthMetricsListFakeDb(opts: {
  rbacHit: boolean;
  establishmentHit: boolean;
  monthRows: unknown[];
}): Db {
  const rbacRows = opts.rbacHit ? ([{ pk: "grant" }] as RbacRow[]) : ([] as RbacRow[]);
  const estRows = opts.establishmentHit
    ? ([{ id: estId, organizationId: orgId }] as RbacRow[])
    : ([] as RbacRow[]);
  const monthResolved = Promise.resolve(opts.monthRows);

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
                    return Promise.resolve(estRows);
                  },
                };
              },
            };
          }
          if (table === establishmentMonthMetrics) {
            return {
              where() {
                return {
                  orderBy() {
                    return monthResolved;
                  },
                };
              },
            };
          }
          throw new Error(`[month-metrics fake] unsupported from(${String(table)})`);
        },
      };
    },
  } as unknown as Db;
}

function createYearMetricsFakeDb(opts: {
  rbacHit: boolean;
  establishmentIds: string[];
  yearRows: unknown[];
}): Db {
  const rbacRows = opts.rbacHit ? ([{ pk: "grant" }] as RbacRow[]) : ([] as RbacRow[]);
  const estResolved = Promise.resolve(opts.establishmentIds.map((id) => ({ id })));
  const yearResolved = Promise.resolve(opts.yearRows);

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
                return estResolved;
              },
            };
          }
          if (table === establishmentYearMetrics) {
            return {
              where() {
                return {
                  orderBy() {
                    return yearResolved;
                  },
                };
              },
            };
          }
          throw new Error(`[year-metrics fake] unsupported from(${String(table)})`);
        },
      };
    },
  } as unknown as Db;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("compliance.establishment.listMonthMetrics", () => {
  it("FORBIDDEN without RBAC", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.establishment.listMonthMetrics",
        ctx: ctxWith(
          createMonthMetricsListFakeDb({ rbacHit: false, establishmentHit: true, monthRows: [] }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
          establishmentId: estId,
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

  it("BAD_REQUEST invalid organizationId", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.establishment.listMonthMetrics",
        ctx: ctxWith(
          createMonthMetricsListFakeDb({ rbacHit: true, establishmentHit: true, monthRows: [] }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: "not-a-uuid",
          establishmentId: estId,
          calendarYear: 2026,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("BAD_REQUEST when establishment not in org", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.establishment.listMonthMetrics",
        ctx: ctxWith(
          createMonthMetricsListFakeDb({ rbacHit: true, establishmentHit: false, monthRows: [] }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
          establishmentId: estId,
          calendarYear: 2026,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Establishment not found in this organization.",
    });
  });

  it("returns month rows when RBAC and establishment resolve", async () => {
    const rows = [
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        establishmentId: estId,
        calendarYear: 2026,
        calendarMonth: 2,
        hoursWorked: 5000,
        avgEmployees: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "compliance.establishment.listMonthMetrics",
      ctx: ctxWith(
        createMonthMetricsListFakeDb({ rbacHit: true, establishmentHit: true, monthRows: rows }),
        authenticatedSession(),
      ),
      type: "query",
      getRawInput: async () => ({
        organizationId: orgId,
        establishmentId: estId,
        calendarYear: 2026,
      }),
      signal: testAbortSignal,
      batchIndex: 0,
    });
    expect(out).toEqual(rows);
  });
});

describe("compliance.establishment.listYearMetrics", () => {
  it("returns empty when org has no establishments", async () => {
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "compliance.establishment.listYearMetrics",
      ctx: ctxWith(
        createYearMetricsFakeDb({ rbacHit: true, establishmentIds: [], yearRows: [] }),
        authenticatedSession(),
      ),
      type: "query",
      getRawInput: async () => ({ organizationId: orgId }),
      signal: testAbortSignal,
      batchIndex: 0,
    });
    expect(out).toEqual([]);
  });

  it("returns year metric rows for org establishments", async () => {
    const yearRows = [
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        establishmentId: estId,
        calendarYear: 2026,
        totalHoursWorked: 100_000,
        avgEmployees: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "compliance.establishment.listYearMetrics",
      ctx: ctxWith(
        createYearMetricsFakeDb({
          rbacHit: true,
          establishmentIds: [estId],
          yearRows,
        }),
        authenticatedSession(),
      ),
      type: "query",
      getRawInput: async () => ({ organizationId: orgId }),
      signal: testAbortSignal,
      batchIndex: 0,
    });
    expect(out).toEqual(yearRows);
  });

  it("FORBIDDEN without RBAC", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "compliance.establishment.listYearMetrics",
        ctx: ctxWith(
          createYearMetricsFakeDb({ rbacHit: false, establishmentIds: [estId], yearRows: [] }),
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
});
