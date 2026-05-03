import { and, eq, or, sql, type InferSelectModel } from "drizzle-orm";
import type { Db } from "@/server/db";
import { PERMISSIONS, userHasPermission } from "@/lib/rbac";
import {
  membership,
  contextSyncGrant,
  contextSyncAgentClassClaim,
} from "@/server/db/schema";
import type { ImsLinkedKind } from "./imsLinkedUri";
import { ctxUriGlobMatch } from "./glob";

export type ContextSyncProtocolOperation =
  | "read"
  | "write"
  | "suggest"
  | "approve"
  | "admin";

export type ContextSyncAccessDenyReason = "grant_mismatch" | "rbac_denied";

export type ContextSyncAllowReason =
  | "protocol_grant_match"
  | "ims_entity_rbac_fallback"
  | "ims_context_rbac_fallback";

async function imsEntityReadAllowed(
  db: Db,
  userId: string,
  organizationId: string,
  kind: ImsLinkedKind,
): Promise<boolean> {
  switch (kind) {
    case "policy_revision":
      return userHasPermission(db, userId, organizationId, PERMISSIONS.POLICY_READ);
    case "rag_source":
      return userHasPermission(db, userId, organizationId, PERMISSIONS.RAG_READ);
    case "controlled_document":
      return userHasPermission(db, userId, organizationId, PERMISSIONS.DOCUMENT_READ);
    default:
      return false;
  }
}

async function rbacAllows(
  db: Db,
  userId: string,
  organizationId: string,
  protocolOp: ContextSyncProtocolOperation,
): Promise<boolean> {
  if (protocolOp === "admin") {
    return userHasPermission(db, userId, organizationId, PERMISSIONS.ORG_ADMIN);
  }
  if (protocolOp === "read" || protocolOp === "suggest") {
    return userHasPermission(db, userId, organizationId, PERMISSIONS.CONTEXT_READ);
  }
  /* write | approve */
  return userHasPermission(db, userId, organizationId, PERMISSIONS.CONTEXT_WRITE);
}

function grantAllowsOp(
  grantOps: readonly string[],
  protocolOp: ContextSyncProtocolOperation,
): boolean {
  if (grantOps.includes("admin")) return true;
  switch (protocolOp) {
    case "read":
      return grantOps.some((o) =>
        ["read", "write", "suggest", "approve"].includes(o),
      );
    case "suggest":
      return grantOps.includes("suggest") || grantOps.includes("write");
    case "write":
      return grantOps.includes("write");
    case "approve":
      return grantOps.includes("approve") || grantOps.includes("write");
    case "admin":
      return false;
    default:
      return false;
  }
}

export type ContextActor = {
  /** Declared actor id (header), e.g. human:{userId} */
  actorId: string;
  /** Optional X-Agent-Class for agent-class grants (requires org-bound claim row) */
  agentClass: string | null;
};

export type ScopedContextGrantRow = InferSelectModel<typeof contextSyncGrant>;

/** Strip unverified agent class headers; only persisted org-bound claims confer class. */
export async function resolveEffectiveContextActor(args: {
  db: Db;
  organizationId: string;
  userId: string;
  actor: ContextActor;
}): Promise<ContextActor> {
  const ac = args.actor.agentClass?.trim();
  if (!ac) {
    return { actorId: args.actor.actorId, agentClass: null };
  }

  const hit = await args.db
    .select({ id: contextSyncAgentClassClaim.id })
    .from(contextSyncAgentClassClaim)
    .where(
      and(
        eq(contextSyncAgentClassClaim.organizationId, args.organizationId),
        eq(contextSyncAgentClassClaim.userId, args.userId),
        eq(contextSyncAgentClassClaim.agentClass, ac),
      ),
    )
    .limit(1);

  if (hit.length === 0) {
    return { actorId: args.actor.actorId, agentClass: null };
  }

  return { actorId: args.actor.actorId, agentClass: ac };
}

export async function loadScopedContextSyncGrants(
  db: Db,
  organizationId: string,
  actor: ContextActor,
): Promise<ScopedContextGrantRow[]> {
  return db
    .select()
    .from(contextSyncGrant)
    .where(
      and(
        eq(contextSyncGrant.organizationId, organizationId),
        or(
          eq(contextSyncGrant.actorId, actor.actorId),
          actor.agentClass
            ? eq(contextSyncGrant.agentClass, actor.agentClass)
            : sql`false`,
        ),
      ),
    );
}

/** True when caller is active member of organization. */
export async function assertOrgMembership(
  db: Db,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: membership.id })
    .from(membership)
    .where(
      and(eq(membership.userId, userId), eq(membership.organizationId, organizationId)),
    )
    .limit(1);
  return rows.length > 0;
}

export type EvaluateContextSyncAccessArgs = {
  db: Db;
  userId: string;
  organizationId: string;
  artifactUri: string;
  actor: ContextActor;
  effectiveActor?: ContextActor;
  operation: ContextSyncProtocolOperation;
  imsLinkedReadKind?: ImsLinkedKind | null;
  /** Skip grant SELECT when list endpoints prefetch grants for the actor. */
  preloadScopedGrants?: ScopedContextGrantRow[] | null;
};

export type EvaluateContextSyncAccessResult =
  | {
      allowed: true;
      matched_grant_id: string | null;
      reason: ContextSyncAllowReason;
    }
  | {
      allowed: false;
      matched_grant_id: null;
      reason: ContextSyncAccessDenyReason;
    };

/**
 * Core ContextSync authorization:
 * — Honor X-Agent-Class only when paired with admin-created claim rows.
 * — If scoped grants exist for this resolved actor/agentClass → default‑deny + glob grants only.
 * — Else IMS read/suggest → entity RBAC (`policy:read`, `rag:read`, `document:read`).
 * — Else generic context blob RBAC (`context:read`, `context:write`, `org:admin`).
 */
export async function evaluateContextSyncAccess(
  args: EvaluateContextSyncAccessArgs,
): Promise<EvaluateContextSyncAccessResult> {
  const {
    db,
    userId,
    organizationId,
    artifactUri,
    operation,
    imsLinkedReadKind = null,
  } = args;

  const actorEffective =
    args.effectiveActor ??
    (await resolveEffectiveContextActor({
      db,
      organizationId,
      userId,
      actor: args.actor,
    }));

  const scopedGrants =
    args.preloadScopedGrants !== undefined && args.preloadScopedGrants !== null
      ? args.preloadScopedGrants
      : await loadScopedContextSyncGrants(db, organizationId, actorEffective);

  if (scopedGrants.length > 0) {
    const matches = scopedGrants.filter((g) =>
      ctxUriGlobMatch(g.artifactPattern, artifactUri),
    );
    const hit = matches.find((g) => grantAllowsOp(g.operations, operation));
    if (hit) {
      return {
        allowed: true,
        matched_grant_id: hit.id,
        reason: "protocol_grant_match",
      };
    }
    return {
      allowed: false,
      matched_grant_id: null,
      reason: "grant_mismatch",
    };
  }

  if (
    imsLinkedReadKind &&
    (operation === "read" || operation === "suggest")
  ) {
    const imsOk = await imsEntityReadAllowed(
      db,
      userId,
      organizationId,
      imsLinkedReadKind,
    );
    if (!imsOk) {
      return { allowed: false, matched_grant_id: null, reason: "rbac_denied" };
    }
    return {
      allowed: true,
      matched_grant_id: null,
      reason: "ims_entity_rbac_fallback",
    };
  }

  const rbacOk = await rbacAllows(db, userId, organizationId, operation);
  if (!rbacOk) {
    return { allowed: false, matched_grant_id: null, reason: "rbac_denied" };
  }
  return {
    allowed: true,
    matched_grant_id: null,
    reason: "ims_context_rbac_fallback",
  };
}

export async function contextSyncAccessAllowed(
  args: Omit<EvaluateContextSyncAccessArgs, "effectiveActor" | "preloadScopedGrants"> & {
    effectiveActor?: ContextActor;
    preloadScopedGrants?: ScopedContextGrantRow[] | null;
  },
): Promise<boolean> {
  const r = await evaluateContextSyncAccess(args);
  return r.allowed;
}

export async function explainContextSyncAccess(args: {
  db: Db;
  userId: string;
  organizationId: string;
  artifactUri: string;
  actor: ContextActor;
  operation: ContextSyncProtocolOperation;
  imsLinkedReadKind?: ImsLinkedKind | null;
}): Promise<{
  allowed: boolean;
  reason: string;
  matched_grant_id: string | null;
}> {
  const r = await evaluateContextSyncAccess(args);
  if (!r.allowed) {
    return {
      allowed: false,
      reason: r.reason,
      matched_grant_id: null,
    };
  }

  return {
    allowed: true,
    reason: r.reason,
    matched_grant_id: r.matched_grant_id,
  };
}
