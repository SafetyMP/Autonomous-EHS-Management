import { describe, expect, it, vi, beforeEach } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import {
  complianceObligation,
  controlledDocument,
  correctiveAction,
  hazard,
  internalAudit,
  ragSource,
  trainingRecord,
} from "@/server/db/schema";
import { createListEntityFakeDb } from "../../helpers/fake-db";

vi.mock("@/server/services/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const orgId = "00000000-0000-4000-8000-000000000001";
const userId = "test_user_stable_id";
const testAbortSignal = new AbortController().signal;

function ctxWith(db: TRPCContext["db"], session: TRPCContext["session"]): TRPCContext {
  return {
    db,
    session,
    ip: "127.0.0.1",
  };
}

function authenticatedSession(): NonNullable<TRPCContext["session"]> {
  return {
    user: { id: userId },
  } as NonNullable<TRPCContext["session"]>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

async function callOrgListQuery(
  ctx: TRPCContext,
  path:
    | "capa.list"
    | "obligation.list"
    | "rag.listSources"
    | "planning.hazard.list"
    | "document.list"
    | "training.list"
    | "internalAudit.list",
  input: { organizationId: string },
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

describe("list-query routers (RBAC + mocked list chain)", () => {
  it("returns UNAUTHORIZED without session for capa.list", async () => {
    await expect(
      callOrgListQuery(
        ctxWith(
          createListEntityFakeDb({
            rbacHit: true,
            entityTable: correctiveAction,
            listRows: [],
          }),
          null,
        ),
        "capa.list",
        { organizationId: orgId },
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("capa.list FORBIDDEN when RBAC has no grant", async () => {
    await expect(
      callOrgListQuery(
        ctxWith(
          createListEntityFakeDb({
            rbacHit: false,
            entityTable: correctiveAction,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        "capa.list",
        { organizationId: orgId },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("capa.list returns rows when permitted", async () => {
    const rows = [{ id: "capa-1", title: "Fix" }];
    const out = await callOrgListQuery(
      ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: correctiveAction,
          listRows: rows,
        }),
        authenticatedSession(),
      ),
      "capa.list",
      { organizationId: orgId },
    );
    expect(out).toEqual(rows);
  });

  it("obligation.list returns rows when permitted", async () => {
    const rows = [{ id: "ob-1", title: "ISO 45001" }];
    const out = await callOrgListQuery(
      ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: complianceObligation,
          listRows: rows,
        }),
        authenticatedSession(),
      ),
      "obligation.list",
      { organizationId: orgId },
    );
    expect(out).toEqual(rows);
  });

  it("rag.listSources returns rows when permitted", async () => {
    const rows = [{ id: "src-1", title: "Manual" }];
    const out = await callOrgListQuery(
      ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: ragSource,
          listRows: rows,
        }),
        authenticatedSession(),
      ),
      "rag.listSources",
      { organizationId: orgId },
    );
    expect(out).toEqual(rows);
  });

  it("planning.hazard.list returns rows when permitted (nested planning router)", async () => {
    const rows = [{ id: "haz-1", title: "Noise" }];
    const out = await callOrgListQuery(
      ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: hazard,
          listRows: rows,
        }),
        authenticatedSession(),
      ),
      "planning.hazard.list",
      { organizationId: orgId },
    );
    expect(out).toEqual(rows);
  });

  it("document.list FORBIDDEN when RBAC has no grant", async () => {
    await expect(
      callOrgListQuery(
        ctxWith(
          createListEntityFakeDb({
            rbacHit: false,
            entityTable: controlledDocument,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        "document.list",
        { organizationId: orgId },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("document.list returns rows when permitted", async () => {
    const rows = [{ id: "doc-1", title: "PPE-policy" }];
    const out = await callOrgListQuery(
      ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: controlledDocument,
          listRows: rows,
        }),
        authenticatedSession(),
      ),
      "document.list",
      { organizationId: orgId },
    );
    expect(out).toEqual(rows);
  });

  it("training.list returns rows when permitted", async () => {
    const rows = [{ id: "rec-1", courseTitle: "LOTO" }];
    const out = await callOrgListQuery(
      ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: trainingRecord,
          listRows: rows,
        }),
        authenticatedSession(),
      ),
      "training.list",
      { organizationId: orgId },
    );
    expect(out).toEqual(rows);
  });

  it("internalAudit.list returns rows when permitted", async () => {
    const rows = [{ id: "ia-1", title: "Q1 EMS audit" }];
    const out = await callOrgListQuery(
      ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: internalAudit,
          listRows: rows,
        }),
        authenticatedSession(),
      ),
      "internalAudit.list",
      { organizationId: orgId },
    );
    expect(out).toEqual(rows);
  });
});
