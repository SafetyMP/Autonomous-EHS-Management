import { describe, expect, it, vi, beforeEach } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import { createIncidentCompositeFakeDb } from "../../helpers/fake-db";

vi.mock("@/server/services/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const orgId = "00000000-0000-4000-8000-000000000001";
const incidentId = "11111111-1111-4111-8111-111111111111";
const userId = "test_user_stable_id";

function ctxWith(db: TRPCContext["db"], session: TRPCContext["session"]): TRPCContext {
  return {
    db,
    session,
    ip: "127.0.0.1",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

function authenticatedSession(userId_: string): NonNullable<TRPCContext["session"]> {
  return {
    user: { id: userId_ },
  } as NonNullable<TRPCContext["session"]>;
}

const testAbortSignal = new AbortController().signal;

async function callIncidentQuery<TInput>(
  ctx: TRPCContext,
  path: "incident.list" | "incident.get",
  input: TInput,
) {
  return callTRPCProcedure({
    router: appRouter,
    path,
    ctx,
    type: "query",
    getRawInput: async () => input,
    signal: testAbortSignal,
    batchIndex: 0,
  });
}

async function callIncidentMutation<TInput>(ctx: TRPCContext, path: "incident.updateStatus", input: TInput) {
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

describe("incidentRouter isolation (mocked DB + audit)", () => {
  it("throws UNAUTHORIZED without a session user", async () => {
    await expect(
      callIncidentQuery(ctxWith(createIncidentCompositeFakeDb({ rbacHit: true }), null), "incident.list", {
        organizationId: orgId,
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws FORBIDDEN when RBAC chain has no grants", async () => {
    await expect(
      callIncidentQuery(
        ctxWith(createIncidentCompositeFakeDb({ rbacHit: false }), authenticatedSession(userId)),
        "incident.list",
        { organizationId: orgId },
      ),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("lists incidents when RBAC succeeds", async () => {
    const rows = [{ id: incidentId, title: "Leak" }];
    const result = await callIncidentQuery(
      ctxWith(
        createIncidentCompositeFakeDb({
          rbacHit: true,
          listRows: rows,
        }),
        authenticatedSession(userId),
      ),
      "incident.list",
      { organizationId: orgId },
    );
    expect(result).toEqual(rows);
  });

  it("NOT_FOUND updateStatus when incident missing after permission", async () => {
    await expect(
      callIncidentMutation(
        ctxWith(
          createIncidentCompositeFakeDb({
            rbacHit: true,
            existingIncident: null,
          }),
          authenticatedSession(userId),
        ),
        "incident.updateStatus",
        {
          organizationId: orgId,
          incidentId,
          status: "investigating",
        },
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: "Incident not found." });
  });

  it("BAD_REQUEST on disallowed workflow transition before transaction runs", async () => {
    await expect(
      callIncidentMutation(
        ctxWith(
          createIncidentCompositeFakeDb({
            rbacHit: true,
            existingIncident: {
              id: incidentId,
              organizationId: orgId,
              status: "closed",
            },
          }),
          authenticatedSession(userId),
        ),
        "incident.updateStatus",
        {
          organizationId: orgId,
          incidentId,
          status: "open",
        },
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Invalid status transition: closed → open",
    });
  });

  it("applies permitted updateStatus mutation through transaction + audit shim", async () => {
    const updated = await callIncidentMutation(
      ctxWith(
        createIncidentCompositeFakeDb({
          rbacHit: true,
          existingIncident: {
            id: incidentId,
            organizationId: orgId,
            status: "open",
          },
        }),
        authenticatedSession(userId),
      ),
      "incident.updateStatus",
      {
        organizationId: orgId,
        incidentId,
        status: "investigating",
      },
    );

    expect(updated).toMatchObject({
      id: incidentId,
      status: "investigating",
    });
  });

  it("forbids open -> closed without investigating first", async () => {
    await expect(
      callIncidentMutation(
        ctxWith(
          createIncidentCompositeFakeDb({
            rbacHit: true,
            existingIncident: {
              id: incidentId,
              organizationId: orgId,
              status: "open",
            },
          }),
          authenticatedSession(userId),
        ),
        "incident.updateStatus",
        {
          organizationId: orgId,
          incidentId,
          status: "closed",
          closureJustification: "Administrative closure after verification complete.",
        },
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Invalid status transition: open → closed",
    });
  });

  it("forbids close without root cause summary on record", async () => {
    await expect(
      callIncidentMutation(
        ctxWith(
          createIncidentCompositeFakeDb({
            rbacHit: true,
            existingIncident: {
              id: incidentId,
              organizationId: orgId,
              status: "investigating",
              rootCauseSummary: "short",
            },
          }),
          authenticatedSession(userId),
        ),
        "incident.updateStatus",
        {
          organizationId: orgId,
          incidentId,
          status: "closed",
          closureJustification: "Administrative closure after verification complete.",
        },
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringMatching(/root cause summary/i),
    });
  });

  it("forbids close without closure justification", async () => {
    await expect(
      callIncidentMutation(
        ctxWith(
          createIncidentCompositeFakeDb({
            rbacHit: true,
            existingIncident: {
              id: incidentId,
              organizationId: orgId,
              status: "investigating",
              rootCauseSummary: "12345678901234567890",
            },
          }),
          authenticatedSession(userId),
        ),
        "incident.updateStatus",
        {
          organizationId: orgId,
          incidentId,
          status: "closed",
        },
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringMatching(/closure justification/i),
    });
  });

  it("allows close from investigating with root cause and justification", async () => {
    const updated = await callIncidentMutation(
      ctxWith(
        createIncidentCompositeFakeDb({
          rbacHit: true,
          existingIncident: {
            id: incidentId,
            organizationId: orgId,
            status: "investigating",
            rootCauseSummary: "12345678901234567890",
          },
        }),
        authenticatedSession(userId),
      ),
      "incident.updateStatus",
      {
        organizationId: orgId,
        incidentId,
        status: "closed",
        closureJustification: "Area verified safe; controls effective per follow-up.",
      },
    );

    expect(updated).toMatchObject({
      id: incidentId,
      status: "closed",
    });
  });

  it("gets incident by id when permitted", async () => {
    const existing = {
      id: incidentId,
      organizationId: orgId,
      title: "Spill",
      status: "open",
      description: "x",
    };
    const result = await callIncidentQuery(
      ctxWith(
        createIncidentCompositeFakeDb({
          rbacHit: true,
          existingIncident: existing,
        }),
        authenticatedSession(userId),
      ),
      "incident.get",
      { organizationId: orgId, incidentId },
    );

    expect(result).toEqual(existing);
  });
});
