import { describe, expect, it, vi, beforeEach } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import {
  createCapaStandaloneCreateFakeDb,
  createObligationUpdateFakeDb,
  createRagBackfillEmptyFakeDb,
} from "../../helpers/fake-db";

const mockEmbedTexts = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/gateway", () => ({
  getAiGateway: () => ({
    embedTexts: mockEmbedTexts,
  }),
}));

vi.mock("@/server/services/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const orgId = "00000000-0000-4000-8000-000000000001";
const obligationId = "22222222-2222-4222-8222-222222222222";
const capaNewId = "33333333-3333-4333-8333-333333333333";
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

async function callMutation<T>(
  ctx: TRPCContext,
  path:
    | "obligation.update"
    | "capa.create"
    | "rag.backfillEmbeddings",
  input: T,
) {
  return callTRPCProcedure({
    router: appRouter,
    path,
    ctx,
    type: "mutation",
    getRawInput: async () => input,
    signal: testAbortSignal,
    batchIndex: 0,
  });
}

describe("obligation.update (mocked DB + audit)", () => {
  it("NOT_FOUND when obligation row missing after permission", async () => {
    await expect(
      callMutation(
        ctxWith(
          createObligationUpdateFakeDb({
            rbacHit: true,
            existingObligation: null,
          }),
          authenticatedSession(),
        ),
        "obligation.update",
        {
          organizationId: orgId,
          obligationId,
          title: "Updated title",
        },
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: "Obligation not found." });
  });

  it("applies transactional update.merge when row exists", async () => {
    const existing = {
      id: obligationId,
      organizationId: orgId,
      title: "Old title",
      requirementType: "legal",
      referenceCode: "RC",
      nextReviewDue: null,
    };
    const updated = await callMutation(
      ctxWith(
        createObligationUpdateFakeDb({
          rbacHit: true,
          existingObligation: existing,
        }),
        authenticatedSession(),
      ),
      "obligation.update",
      {
        organizationId: orgId,
        obligationId,
        title: "New title",
      },
    );
    expect(updated).toMatchObject({
      id: obligationId,
      title: "New title",
      requirementType: "legal",
    });
  });
});

describe("capa.create standalone (mocked DB + audit)", () => {
  it("BAD_REQUEST when standalone details shorter than 20 characters", async () => {
    await expect(
      callMutation(
        ctxWith(
          createCapaStandaloneCreateFakeDb({
            rbacHit: true,
            createdId: capaNewId,
          }),
          authenticatedSession(),
        ),
        "capa.create",
        {
          organizationId: orgId,
          title: "Short title okay",
          details: "Too short.",
        },
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringMatching(/at least 20 characters/i),
    });
  });

  it("returns created row after standalone insert", async () => {
    const details = "This is twenty chars!!";
    const created = await callMutation(
      ctxWith(
        createCapaStandaloneCreateFakeDb({
          rbacHit: true,
          createdId: capaNewId,
        }),
        authenticatedSession(),
      ),
      "capa.create",
      {
        organizationId: orgId,
        title: "Fix steam leak",
        details,
      },
    );
    expect(created).toMatchObject({
      id: capaNewId,
      title: "Fix steam leak",
      details,
      status: "planned",
    });
  });
});

describe("rag.backfillEmbeddings (no chunks → short-circuit)", () => {
  it("returns { updated: 0 } without querying AI gateway", async () => {
    const result = await callMutation(
      ctxWith(createRagBackfillEmptyFakeDb(true), authenticatedSession()),
      "rag.backfillEmbeddings",
      { organizationId: orgId },
    );
    expect(result).toEqual({ updated: 0 });
    expect(mockEmbedTexts).not.toHaveBeenCalled();
  });
});
