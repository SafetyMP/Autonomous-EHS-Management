import { describe, expect, it, vi, beforeEach } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import * as audit from "@/server/services/audit";
import { PERMISSIONS } from "@/lib/rbac";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import { createRbacOnlyFakeDb } from "../../helpers/fake-db";

const mockCompleteJson = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/gateway", () => ({
  getAiGateway: () => ({
    completeJson: mockCompleteJson,
    embedTexts: vi.fn().mockResolvedValue([[]]),
  }),
}));

vi.mock("@/server/services/ragSearch", () => ({
  searchRagChunks: vi.fn().mockResolvedValue([]),
}));

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
  mockCompleteJson.mockReset();
});

describe("aiAssistant intake drafts — parse failure audit", () => {
  it("writes ai.assistant.draft_parse_failed before BAD_REQUEST when JSON never validates (observation)", async () => {
    mockCompleteJson.mockResolvedValueOnce("not-json").mockResolvedValueOnce("{}");
    const spy = vi.spyOn(audit, "writeAuditLog").mockResolvedValue(undefined);

    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "aiAssistant.proposeObservationIntakeDraft",
        ctx: ctxWith(createRbacOnlyFakeDb(true), authenticatedSession()),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          contextHint: "something happened at the line minimum ten chars",
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Assistant draft was not valid JSON (AI_ASSISTANT_INVALID_JSON).",
    });

    const failureCall = spy.mock.calls.find(
      (c) => (c[1] as { action?: string }).action === "ai.assistant.draft_parse_failed",
    );
    expect(failureCall).toBeDefined();
    expect(failureCall?.[1]).toMatchObject({
      organizationId: orgId,
      actorUserId: userId,
      action: "ai.assistant.draft_parse_failed",
      entityType: "ai_assistant_session",
      payload: {
        procedure: "aiAssistant.proposeObservationIntakeDraft",
        model: expect.any(String),
      },
    });
  });

  it("is FORBIDDEN without RAG read", async () => {
    mockCompleteJson.mockResolvedValue("{}");
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "aiAssistant.proposeObservationIntakeDraft",
        ctx: ctxWith(createRbacOnlyFakeDb(false), authenticatedSession()),
        type: "mutation",
        getRawInput: async () => ({
          organizationId: orgId,
          contextHint: "something happened at the line minimum ten chars",
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: `Missing permission: ${PERMISSIONS.RAG_READ}`,
    });
    expect(mockCompleteJson).not.toHaveBeenCalled();
  });
});
