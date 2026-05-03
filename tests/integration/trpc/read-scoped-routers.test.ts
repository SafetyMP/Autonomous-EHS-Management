import { describe, expect, it, vi, beforeEach } from "vitest";
import { callTRPCProcedure } from "@trpc/server";
import { appRouter } from "@/server/trpc/root";
import type { TRPCContext } from "@/server/trpc/context";
import { ehsEvidenceAttachment } from "@/server/db/schema";
import {
  createDocumentGetFakeDb,
  createListEntityFakeDb,
  createOrganizationMineFakeDb,
  createOrganizationSitesFakeDb,
} from "../../helpers/fake-db";

vi.mock("@/server/services/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const orgId = "00000000-0000-4000-8000-000000000001";
const documentId = "22222222-2222-4222-8222-222222222222";
const entityIncidentId = "33333333-3333-4333-8333-333333333333";
const entityCapaId = "44444444-4444-4444-8444-444444444444";
const userId = "test_user_stable_id";
const testAbortSignal = new AbortController().signal;

function ctxWith(db: TRPCContext["db"], session: TRPCContext["session"]): TRPCContext {
  return { db, session, ip: "127.0.0.1" };
}

function authenticatedSession(): NonNullable<TRPCContext["session"]> {
  return {
    user: { id: userId },
  } as NonNullable<TRPCContext["session"]>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("document.get (scoped read)", () => {
  it("returns NOT_FOUND when document row missing", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "document.get",
        ctx: ctxWith(
          createDocumentGetFakeDb({
            rbacHit: true,
            row: null,
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
          documentId,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Document not found.",
    });
  });

  it("returns row when RBAC succeeds and entity exists", async () => {
    const row = { id: documentId, organizationId: orgId, title: "SOP" };
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "document.get",
      ctx: ctxWith(
        createDocumentGetFakeDb({
          rbacHit: true,
          row,
        }),
        authenticatedSession(),
      ),
      type: "query",
      getRawInput: async () => ({
        organizationId: orgId,
        documentId,
      }),
      signal: testAbortSignal,
      batchIndex: 0,
    });
    expect(out).toEqual(row);
  });
});

describe("ehsEvidence.list", () => {
  it("is FORBIDDEN when RBAC blocks incident read evidence", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "ehsEvidence.list",
        ctx: ctxWith(
          createListEntityFakeDb({
            rbacHit: false,
            entityTable: ehsEvidenceAttachment,
            listRows: [],
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
          entityType: "incident",
          entityId: entityIncidentId,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns attachments for incidents when RBAC succeeds", async () => {
    const rows = [{ id: "ev-1", entityId: entityIncidentId }];
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "ehsEvidence.list",
      ctx: ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: ehsEvidenceAttachment,
          listRows: rows,
        }),
        authenticatedSession(),
      ),
      type: "query",
      getRawInput: async () => ({
        organizationId: orgId,
        entityType: "incident",
        entityId: entityIncidentId,
      }),
      signal: testAbortSignal,
      batchIndex: 0,
    });
    expect(out).toEqual(rows);
  });

  it("uses CAPA read permission for corrective_action attachments", async () => {
    const rows = [{ id: "ev-2", entityId: entityCapaId }];
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "ehsEvidence.list",
      ctx: ctxWith(
        createListEntityFakeDb({
          rbacHit: true,
          entityTable: ehsEvidenceAttachment,
          listRows: rows,
        }),
        authenticatedSession(),
      ),
      type: "query",
      getRawInput: async () => ({
        organizationId: orgId,
        entityType: "corrective_action",
        entityId: entityCapaId,
      }),
      signal: testAbortSignal,
      batchIndex: 0,
    });
    expect(out).toEqual(rows);
  });
});

describe("organization read helpers", () => {
  it("organization.mine returns joined org summaries", async () => {
    const rows = [{ id: orgId, name: "Acme Corp" }];
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "organization.mine",
      ctx: ctxWith(createOrganizationMineFakeDb(rows), authenticatedSession()),
      type: "query",
      getRawInput: async () => undefined,
      signal: testAbortSignal,
      batchIndex: 0,
    });
    expect(out).toEqual(rows);
  });

  it("organization.sites is FORBIDDEN when user has no membership", async () => {
    await expect(
      callTRPCProcedure({
        router: appRouter,
        path: "organization.sites",
        ctx: ctxWith(
          createOrganizationSitesFakeDb({
            memberHits: false,
            siteRows: [],
          }),
          authenticatedSession(),
        ),
        type: "query",
        getRawInput: async () => ({
          organizationId: orgId,
        }),
        signal: testAbortSignal,
        batchIndex: 0,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Not a member of this organization.",
    });
  });

  it("organization.sites returns rows for members", async () => {
    const siteRows = [{ id: "site-1", name: "Plant A" }];
    const out = await callTRPCProcedure({
      router: appRouter,
      path: "organization.sites",
      ctx: ctxWith(
        createOrganizationSitesFakeDb({
          memberHits: true,
          siteRows,
        }),
        authenticatedSession(),
      ),
      type: "query",
      getRawInput: async () => ({
        organizationId: orgId,
      }),
      signal: testAbortSignal,
      batchIndex: 0,
    });
    expect(out).toEqual(siteRows);
  });
});
