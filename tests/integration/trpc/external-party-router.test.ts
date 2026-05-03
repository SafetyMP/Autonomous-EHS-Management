import { describe, expect, it, vi, beforeEach } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import { createExternalPartyGetFakeDb } from "../../helpers/fake-db";

vi.mock("@/server/services/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const orgId = "00000000-0000-4000-8000-000000000001";
const partyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
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

describe("externalParty.getParty", () => {
  it("is FORBIDDEN when RBAC denies external party read", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "externalParty.getParty",
        ctx: ctxWith(
          createExternalPartyGetFakeDb({
            rbacHit: false,
            row: null,
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
          externalPartyId: partyId,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when party is missing after permission", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "externalParty.getParty",
        ctx: ctxWith(
          createExternalPartyGetFakeDb({
            rbacHit: true,
            row: null,
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
          externalPartyId: partyId,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "External party not found.",
    });
  });

  it("returns the row when RBAC succeeds and entity exists", async () => {
    const row = {
      id: partyId,
      organizationId: orgId,
      companyName: "Acme Contractors",
      partyType: "contractor",
    };
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "externalParty.getParty",
      ctx: ctxWith(
        createExternalPartyGetFakeDb({
          rbacHit: true,
          row,
        }),
        authenticatedSession(),
      ),
      type: "query",
      getRawInput: async () => ({
        organizationId: orgId,
        externalPartyId: partyId,
      }),
      signal: testAbortSignal,
      batchIndex: 0,
    });
    expect(out).toEqual(row);
  });
});
