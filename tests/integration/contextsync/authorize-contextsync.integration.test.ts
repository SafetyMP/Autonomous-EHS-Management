import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as rbac from "@/lib/rbac";
import { PERMISSIONS } from "@/lib/rbac";
import * as authz from "@/server/services/contextSync/authorize";
import { buildCtxUri } from "@/server/services/contextSync/parseCtxUri";
import { createContextSyncAuthorizeFakeDb } from "../../helpers/fake-db";

const orgId = "00000000-0000-4000-8000-000000000001";
const userId = "user_ctxsync_test";
const humanActor = `human:${userId}`;

beforeEach(() => {
  vi.spyOn(rbac, "userHasPermission").mockResolvedValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("authz.evaluateContextSyncAccess", () => {
  it("allows read via context RBAC when no grants and CONTEXT_READ", async () => {
    vi.spyOn(rbac, "userHasPermission").mockImplementation(async (_db, _uid, _oid, key) => {
      return key === PERMISSIONS.CONTEXT_READ;
    });

    const uri = buildCtxUri(orgId, "vault", "readme");
    const db = createContextSyncAuthorizeFakeDb({
      membershipOk: true,
      grantRows: [],
      agentClassClaimRows: [],
    });

    const r = await authz.evaluateContextSyncAccess({
      db,
      userId,
      organizationId: orgId,
      artifactUri: uri,
      actor: { actorId: humanActor, agentClass: null },
      operation: "read",
    });

    expect(r).toEqual({
      allowed: true,
      matched_grant_id: null,
      reason: "ims_context_rbac_fallback",
    });
  });

  it("denies rbac path with grant_mismatch when scoped grants exist but pattern misses", async () => {
    const uri = buildCtxUri(orgId, "vault", "secret");
    const grantRow = {
      id: "g1",
      organizationId: orgId,
      actorId: humanActor,
      agentClass: null,
      artifactPattern: `ctx://${orgId}/hr/*`,
      operations: ["read"],
    };
    const db = createContextSyncAuthorizeFakeDb({
      membershipOk: true,
      grantRows: [grantRow],
      agentClassClaimRows: [],
    });

    const r = await authz.evaluateContextSyncAccess({
      db,
      userId,
      organizationId: orgId,
      artifactUri: uri,
      actor: { actorId: humanActor, agentClass: null },
      operation: "read",
    });

    expect(r).toEqual({
      allowed: false,
      matched_grant_id: null,
      reason: "grant_mismatch",
    });
  });

  it("allows protocol_grant_match when grant glob hits", async () => {
    const uri = buildCtxUri(orgId, "vault", "x");
    const row = {
      id: "g2",
      organizationId: orgId,
      actorId: humanActor,
      agentClass: null,
      artifactPattern: "*",
      operations: ["read"],
    };
    const db = createContextSyncAuthorizeFakeDb({
      membershipOk: true,
      grantRows: [row],
      agentClassClaimRows: [],
    });

    const r = await authz.evaluateContextSyncAccess({
      db,
      userId,
      organizationId: orgId,
      artifactUri: uri,
      actor: { actorId: humanActor, agentClass: null },
      operation: "read",
    });

    expect(r).toMatchObject({
      allowed: true,
      matched_grant_id: "g2",
      reason: "protocol_grant_match",
    });
  });

  it("uses IMS entity RBAC for policy_revision read", async () => {
    vi.spyOn(rbac, "userHasPermission").mockImplementation(async (_db, _uid, _oid, key) => {
      return key === PERMISSIONS.POLICY_READ;
    });

    const revision = "aaaaaaaa-bbbb-4ccc-a111-aaaaaaaaaaaa";
    const uri = buildCtxUri(orgId, "ims", `policy-revision/${revision}`);
    const db = createContextSyncAuthorizeFakeDb({
      membershipOk: true,
      grantRows: [],
      agentClassClaimRows: [],
    });

    const r = await authz.evaluateContextSyncAccess({
      db,
      userId,
      organizationId: orgId,
      artifactUri: uri,
      actor: { actorId: humanActor, agentClass: null },
      operation: "read",
      imsLinkedReadKind: "policy_revision",
    });

    expect(r).toEqual({
      allowed: true,
      matched_grant_id: null,
      reason: "ims_entity_rbac_fallback",
    });
  });

  it("resolveEffectiveContextActor strips header class without org claim", async () => {
    const db = createContextSyncAuthorizeFakeDb({
      membershipOk: true,
      grantRows: [],
      agentClassClaimRows: [],
    });
    const a = await authz.resolveEffectiveContextActor({
      db,
      organizationId: orgId,
      userId,
      actor: { actorId: humanActor, agentClass: "cursor" },
    });
    expect(a).toEqual({ actorId: humanActor, agentClass: null });
  });

  it("resolveEffectiveContextActor preserves class when claim exists", async () => {
    const db = createContextSyncAuthorizeFakeDb({
      membershipOk: true,
      grantRows: [],
      agentClassClaimRows: [{ id: "claim-1" }],
    });
    const a = await authz.resolveEffectiveContextActor({
      db,
      organizationId: orgId,
      userId,
      actor: { actorId: humanActor, agentClass: "cursor" },
    });
    expect(a).toEqual({ actorId: humanActor, agentClass: "cursor" });
  });

  it("falls back to RBAC when scoped grants are empty (e.g. after actor resolution)", async () => {
    const uri = buildCtxUri(orgId, "z", "a");
    const db = createContextSyncAuthorizeFakeDb({
      membershipOk: true,
      grantRows: [],
      agentClassClaimRows: [],
    });
    vi.spyOn(rbac, "userHasPermission").mockResolvedValue(false);

    const r = await authz.evaluateContextSyncAccess({
      db,
      userId,
      organizationId: orgId,
      artifactUri: uri,
      actor: { actorId: humanActor, agentClass: null },
      operation: "read",
      preloadScopedGrants: [],
    });

    expect(r).toEqual({
      allowed: false,
      matched_grant_id: null,
      reason: "rbac_denied",
    });
  });

  it("honors agent_class grant when org claim row exists", async () => {
    const uri = buildCtxUri(orgId, "z", "a");
    const grantRow = {
      id: "g4",
      organizationId: orgId,
      actorId: null,
      agentClass: "cursor",
      artifactPattern: "*",
      operations: ["read"],
    };

    const db = createContextSyncAuthorizeFakeDb({
      membershipOk: true,
      grantRows: [grantRow],
      agentClassClaimRows: [{ id: "claim-1" }],
    });

    vi.spyOn(rbac, "userHasPermission").mockResolvedValue(false);

    const r = await authz.evaluateContextSyncAccess({
      db,
      userId,
      organizationId: orgId,
      artifactUri: uri,
      actor: { actorId: humanActor, agentClass: "cursor" },
      operation: "read",
    });

    expect(r).toMatchObject({
      allowed: true,
      matched_grant_id: "g4",
      reason: "protocol_grant_match",
    });
  });
});

describe("authz.explainContextSyncAccess", () => {
  it("surfaces rbac_denied on deny paths", async () => {
    const uri = buildCtxUri(orgId, "vault", "x");
    const db = createContextSyncAuthorizeFakeDb({
      membershipOk: true,
      grantRows: [],
      agentClassClaimRows: [],
    });

    const ex = await authz.explainContextSyncAccess({
      db,
      userId,
      organizationId: orgId,
      artifactUri: uri,
      actor: { actorId: humanActor, agentClass: null },
      operation: "read",
    });

    expect(ex.allowed).toBe(false);
    expect(ex.reason).toBe("rbac_denied");
  });
});
