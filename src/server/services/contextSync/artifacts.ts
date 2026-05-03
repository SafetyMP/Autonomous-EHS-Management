import { createHash } from "node:crypto";
import { and, asc, desc, eq, sql, isNull, type InferSelectModel } from "drizzle-orm";
import type { Db } from "@/server/db";
import {
  contextSyncArtifact,
  contextSyncArtifactVersion,
  contextSyncProvenance,
  contextSyncActor,
  contextSyncGrant,
} from "@/server/db/schema";
import { PERMISSIONS, userHasPermission } from "@/lib/rbac";
import { writeAuditLog } from "@/server/services/audit";
import { computeLineDiff } from "@/server/services/contextSync/lineDiff";
import {
  contextSyncAccessAllowed,
  assertOrgMembership,
  evaluateContextSyncAccess,
  loadScopedContextSyncGrants,
  resolveEffectiveContextActor,
  type ContextActor,
} from "@/server/services/contextSync/authorize";
import type { ParsedCtxUri } from "@/server/services/contextSync/parseCtxUri";
import { ContextSyncError } from "@/server/services/contextSync/errors";
import { parseImsLinkedUri } from "@/server/services/contextSync/imsLinkedUri";
import type { ImsLinkedKind } from "@/server/services/contextSync/imsLinkedUri";
import { loadImsLinkedSnapshot, loadImsPolicyRevisionHistory } from "@/server/services/contextSync/imsRead";

function sha256hex(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

async function requirePermission(
  db: Db,
  userId: string,
  organizationId: string,
  key: (typeof PERMISSIONS)[keyof typeof PERMISSIONS],
): Promise<void> {
  const ok = await userHasPermission(db, userId, organizationId, key);
  if (!ok) {
    throw new ContextSyncError(403, {
      error: "forbidden",
      reason: "rbac_denied",
      message: `Missing permission: ${key}`,
    });
  }
}

async function logProvenance(
  tx: Pick<Db, "insert">,
  input: {
    organizationId: string;
    actorId: string;
    operation: "read" | "write";
    artifactUri: string;
    versionTouched: number;
    downstreamUri?: string | null;
  },
) {
  await tx.insert(contextSyncProvenance).values({
    organizationId: input.organizationId,
    actorId: input.actorId,
    operation: input.operation,
    artifactUri: input.artifactUri,
    versionTouched: input.versionTouched,
    downstreamUri: input.downstreamUri ?? null,
  });
}

type ContextActorGate = {
  userId: string;
  actor: ContextActor;
  op: "read" | "write" | "suggest" | "approve" | "admin";
};

function assertNoImsSyntheticURI(parsed: ParsedCtxUri): void {
  if (parseImsLinkedUri(parsed)) {
    throw new ContextSyncError(409, {
      error: "conflict",
      reason: "ims_authoritative",
      message:
        "This URI denotes IMS-backed context. Update policy revisions, RAG sources, or controlled documents via EHS consoles / tRPC; ContextSync exposes read‑only snapshots at this URI shape.",
    });
  }
}

async function authorizeOrThrow(
  db: Db,
  args: ParsedCtxUri & ContextActorGate,
  imsLinkedReadKind: ImsLinkedKind | null = null,
) {
  const { userId } = args;
  const member = await assertOrgMembership(db, userId, args.orgId);
  if (!member) {
    throw new ContextSyncError(403, { error: "forbidden", reason: "not_org_member" });
  }

  const op = args.op;
  const imsLinkedPayload =
    op === "read" || op === "suggest" ? imsLinkedReadKind : null;

  const ev = await evaluateContextSyncAccess({
    db,
    userId,
    organizationId: args.orgId,
    artifactUri: args.uri,
    actor: args.actor,
    operation: op,
    imsLinkedReadKind: imsLinkedPayload,
  });
  if (!ev.allowed) {
    throw new ContextSyncError(403, {
      error: "forbidden",
      reason: ev.reason,
      message:
        ev.reason === "grant_mismatch"
          ? "No matching protocol grant for this artifact and operation."
          : "Insufficient permission for this operation.",
    });
  }
}

export async function contextSyncCreateArtifact(
  db: Db,
  input: ParsedCtxUri & ContextActorGate & {
    name: string;
    contentType: string;
    content: string;
    summary: string;
    authorActorId: string;
  },
) {
  assertNoImsSyntheticURI({
    uri: input.uri,
    orgId: input.orgId,
    domain: input.domain,
    artifactPath: input.artifactPath,
  });

  await authorizeOrThrow(db, {
    ...input,
    uri: input.uri,
    orgId: input.orgId,
    op: "write",
  });

  const hash = sha256hex(input.content);

  try {
    return await db.transaction(async (tx) => {
      const [artifact] = await tx
        .insert(contextSyncArtifact)
        .values({
          organizationId: input.orgId,
          uri: input.uri,
          domainSegment: input.domain,
          artifactPath: input.artifactPath,
          name: input.name,
          contentType: input.contentType,
          headVersion: 1,
        })
        .returning();

      if (!artifact) {
        throw new ContextSyncError(500, { error: "internal" });
      }

      await tx.insert(contextSyncArtifactVersion).values({
        artifactId: artifact.id,
        version: 1,
        content: input.content,
        contentSha256: hash,
        summary: input.summary.slice(0, 1024),
        authorActorId: input.authorActorId,
      });

      await logProvenance(tx, {
        organizationId: input.orgId,
        actorId: input.actor.actorId,
        operation: "write",
        artifactUri: input.uri,
        versionTouched: 1,
      });

      await writeAuditLog(tx, {
        organizationId: input.orgId,
        actorUserId: input.userId,
        action: "context_sync.artifact.create",
        entityType: "context_sync_artifact",
        entityId: artifact.id,
        payload: { uri: input.uri },
      });

      return { artifact, version: 1 };
    });
  } catch (e: unknown) {
    if (e instanceof ContextSyncError) throw e;
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "23505"
    ) {
      throw new ContextSyncError(409, {
        error: "conflict",
        message: "Artifact URI already exists",
      });
    }
    throw e;
  }
}

export async function contextSyncReadArtifact(
  db: Db,
  input: ParsedCtxUri & ContextActorGate & { version: number | null },
): Promise<{
  artifact:
    | InferSelectModel<typeof contextSyncArtifact>
    | (Omit<InferSelectModel<typeof contextSyncArtifact>, "id"> & { id?: never });
  versionRow:
    | InferSelectModel<typeof contextSyncArtifactVersion>
    | { content: string; contentSha256: string };
  version: number;
  imsMeta?: Record<string, unknown>;
}> {
  const imsLinked = parseImsLinkedUri(input);
  await authorizeOrThrow(
    db,
    {
      ...input,
      uri: input.uri,
      orgId: input.orgId,
      op: "read",
    },
    imsLinked?.kind ?? null,
  );

  if (imsLinked) {
    if (input.version !== null && input.version !== 1) {
      throw new ContextSyncError(400, {
        error: "bad_request",
        message:
          "IMS-linked snapshots are sourced from Drizzle IMS tables; omit ?version or pass version=1 for the latest snapshot.",
      });
    }

    const snap = await loadImsLinkedSnapshot(db, input.orgId, imsLinked);

    await db.insert(contextSyncProvenance).values({
      organizationId: input.orgId,
      actorId: input.actor.actorId,
      operation: "read",
      artifactUri: input.uri,
      versionTouched: snap.versionStamp,
      downstreamUri: null,
    });

    const contentHash = sha256hex(snap.content);

    return {
      imsMeta: snap.ims as unknown as Record<string, unknown>,
      artifact: {
        uri: input.uri,
        organizationId: input.orgId,
        domainSegment: input.domain,
        artifactPath: input.artifactPath,
        name: snap.name,
        contentType: snap.contentType,
        headVersion: 1,
        deletedAt: null,
        createdAt: snap.artifactTimestamps.createdAt,
        updatedAt: snap.artifactTimestamps.updatedAt,
      },
      versionRow: { content: snap.content, contentSha256: contentHash },
      version: 1,
    };
  }

  const [artifact] = await db
    .select()
    .from(contextSyncArtifact)
    .where(
      and(
        eq(contextSyncArtifact.organizationId, input.orgId),
        eq(contextSyncArtifact.uri, input.uri),
        isNull(contextSyncArtifact.deletedAt),
      ),
    )
    .limit(1);

  if (!artifact) {
    throw new ContextSyncError(404, { error: "not_found", message: "Artifact not found" });
  }

  const versionNum = input.version ?? artifact.headVersion;

  const [ver] = await db
    .select()
    .from(contextSyncArtifactVersion)
    .where(
      and(
        eq(contextSyncArtifactVersion.artifactId, artifact.id),
        eq(contextSyncArtifactVersion.version, versionNum),
      ),
    )
    .limit(1);

  if (!ver) {
    throw new ContextSyncError(404, {
      error: "not_found",
      message: "Version not found",
    });
  }

  await db.insert(contextSyncProvenance).values({
    organizationId: input.orgId,
    actorId: input.actor.actorId,
    operation: "read",
    artifactUri: input.uri,
    versionTouched: versionNum,
    downstreamUri: null,
  });

  return { artifact, versionRow: ver, version: versionNum };
}

export async function contextSyncUpdateArtifact(
  db: Db,
  input: ParsedCtxUri & ContextActorGate & {
    content: string;
    summary: string;
    authorActorId: string;
  },
) {
  assertNoImsSyntheticURI({
    uri: input.uri,
    orgId: input.orgId,
    domain: input.domain,
    artifactPath: input.artifactPath,
  });

  await authorizeOrThrow(db, {
    ...input,
    uri: input.uri,
    orgId: input.orgId,
    op: "write",
  });

  const [artifact] = await db
    .select()
    .from(contextSyncArtifact)
    .where(
      and(
        eq(contextSyncArtifact.organizationId, input.orgId),
        eq(contextSyncArtifact.uri, input.uri),
        isNull(contextSyncArtifact.deletedAt),
      ),
    )
    .limit(1);

  if (!artifact) {
    throw new ContextSyncError(404, { error: "not_found", message: "Artifact not found" });
  }

  const newVersion = artifact.headVersion + 1;
  const hash = sha256hex(input.content);

  return db.transaction(async (tx) => {
    await tx
      .update(contextSyncArtifact)
      .set({
        headVersion: newVersion,
        updatedAt: new Date(),
      })
      .where(eq(contextSyncArtifact.id, artifact.id));

    await tx.insert(contextSyncArtifactVersion).values({
      artifactId: artifact.id,
      version: newVersion,
      content: input.content,
      contentSha256: hash,
      summary: input.summary.slice(0, 1024),
      authorActorId: input.authorActorId,
    });

    await logProvenance(tx, {
      organizationId: input.orgId,
      actorId: input.actor.actorId,
      operation: "write",
      artifactUri: input.uri,
      versionTouched: newVersion,
    });

    await writeAuditLog(tx, {
      organizationId: input.orgId,
      actorUserId: input.userId,
      action: "context_sync.artifact.update",
      entityType: "context_sync_artifact",
      entityId: artifact.id,
      payload: { uri: input.uri, version: newVersion },
    });

    return { artifactId: artifact.id, version: newVersion };
  });
}

export async function contextSoftDeleteArtifact(
  db: Db,
  input: ParsedCtxUri & ContextActorGate,
) {
  assertNoImsSyntheticURI({
    uri: input.uri,
    orgId: input.orgId,
    domain: input.domain,
    artifactPath: input.artifactPath,
  });

  await authorizeOrThrow(db, {
    ...input,
    uri: input.uri,
    orgId: input.orgId,
    op: "write",
  });

  const [artifact] = await db
    .select()
    .from(contextSyncArtifact)
    .where(
      and(
        eq(contextSyncArtifact.organizationId, input.orgId),
        eq(contextSyncArtifact.uri, input.uri),
        isNull(contextSyncArtifact.deletedAt),
      ),
    )
    .limit(1);

  if (!artifact) {
    throw new ContextSyncError(404, { error: "not_found", message: "Artifact not found" });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(contextSyncArtifact)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(contextSyncArtifact.id, artifact.id));

    await writeAuditLog(tx, {
      organizationId: input.orgId,
      actorUserId: input.userId,
      action: "context_sync.artifact.soft_delete",
      entityType: "context_sync_artifact",
      entityId: artifact.id,
      payload: { uri: input.uri },
    });
  });
}

export async function contextSyncArtifactHistory(db: Db, input: ParsedCtxUri & ContextActorGate): Promise<
  | {
      source: "ims_policy";
      uri: string;
      versions: Awaited<ReturnType<typeof loadImsPolicyRevisionHistory>>;
    }
  | {
      source: "standalone";
      artifact: InferSelectModel<typeof contextSyncArtifact>;
      versions: {
        version: number;
        authorActorId: string;
        summary: string | null;
        contentSha256: string;
        createdAt: Date;
      }[];
    }
> {
  const ims = parseImsLinkedUri(input);
  await authorizeOrThrow(
    db,
    {
      ...input,
      uri: input.uri,
      orgId: input.orgId,
      op: "read",
    },
    ims?.kind ?? null,
  );

  if (ims?.kind === "policy_revision") {
    const versions = await loadImsPolicyRevisionHistory(db, input.orgId, ims.id);
    return { source: "ims_policy", uri: input.uri, versions };
  }

  const [artifact] = await db
    .select()
    .from(contextSyncArtifact)
    .where(
      and(
        eq(contextSyncArtifact.organizationId, input.orgId),
        eq(contextSyncArtifact.uri, input.uri),
      ),
    )
    .limit(1);

  if (!artifact) {
    throw new ContextSyncError(404, { error: "not_found", message: "Artifact not found" });
  }

  const versions = await db
    .select({
      version: contextSyncArtifactVersion.version,
      authorActorId: contextSyncArtifactVersion.authorActorId,
      summary: contextSyncArtifactVersion.summary,
      contentSha256: contextSyncArtifactVersion.contentSha256,
      createdAt: contextSyncArtifactVersion.createdAt,
    })
    .from(contextSyncArtifactVersion)
    .where(eq(contextSyncArtifactVersion.artifactId, artifact.id))
    .orderBy(desc(contextSyncArtifactVersion.version));

  return { source: "standalone", artifact, versions };
}

export async function contextSyncArtifactDiff(
  db: Db,
  input: ParsedCtxUri & ContextActorGate & { from: number; to: number },
) {
  if (parseImsLinkedUri(input)) {
    throw new ContextSyncError(422, {
      error: "bad_request",
      message:
        "IMS-linked line diffs are not exposed on this endpoint yet; compare revisions via IMS or standalone ContextSync blobs.",
    });
  }

  await authorizeOrThrow(db, {
    ...input,
    uri: input.uri,
    orgId: input.orgId,
    op: "read",
  });

  const [artifact] = await db
    .select()
    .from(contextSyncArtifact)
    .where(
      and(
        eq(contextSyncArtifact.organizationId, input.orgId),
        eq(contextSyncArtifact.uri, input.uri),
      ),
    )
    .limit(1);

  if (!artifact) {
    throw new ContextSyncError(404, { error: "not_found", message: "Artifact not found" });
  }

  const [va] = await db
    .select()
    .from(contextSyncArtifactVersion)
    .where(
      and(
        eq(contextSyncArtifactVersion.artifactId, artifact.id),
        eq(contextSyncArtifactVersion.version, input.from),
      ),
    )
    .limit(1);
  const [vb] = await db
    .select()
    .from(contextSyncArtifactVersion)
    .where(
      and(
        eq(contextSyncArtifactVersion.artifactId, artifact.id),
        eq(contextSyncArtifactVersion.version, input.to),
      ),
    )
    .limit(1);

  if (!va || !vb) {
    throw new ContextSyncError(404, {
      error: "not_found",
      message: "Requested version missing",
    });
  }

  const diff = computeLineDiff(va.content, vb.content);
  return {
    artifactUri: input.uri,
    from: input.from,
    to: input.to,
    stats: diff.stats,
    hunks: diff.hunks.slice(0, 500),
  };
}

export async function contextSyncListArtifacts(
  db: Db,
  input: {
    userId: string;
    actor: ContextActor;
    organizationId: string;
    domain?: string | null;
    limit: number;
  },
) {
  const member = await assertOrgMembership(db, input.userId, input.organizationId);
  if (!member) {
    throw new ContextSyncError(403, { error: "forbidden", reason: "not_org_member" });
  }

  const effectiveActor = await resolveEffectiveContextActor({
    db,
    organizationId: input.organizationId,
    userId: input.userId,
    actor: input.actor,
  });
  const scopedGrants = await loadScopedContextSyncGrants(
    db,
    input.organizationId,
    effectiveActor,
  );

  const whereParts = [
    eq(contextSyncArtifact.organizationId, input.organizationId),
    isNull(contextSyncArtifact.deletedAt),
  ];
  if (input.domain) {
    whereParts.push(eq(contextSyncArtifact.domainSegment, input.domain));
  }

  const rows = await db
    .select({
      uri: contextSyncArtifact.uri,
      name: contextSyncArtifact.name,
      domainSegment: contextSyncArtifact.domainSegment,
      headVersion: contextSyncArtifact.headVersion,
      deletedAt: contextSyncArtifact.deletedAt,
      createdAt: contextSyncArtifact.createdAt,
      updatedAt: contextSyncArtifact.updatedAt,
    })
    .from(contextSyncArtifact)
    .where(and(...whereParts))
    .orderBy(asc(contextSyncArtifact.domainSegment), asc(contextSyncArtifact.uri))
    .limit(Math.min(input.limit, 500));

  const allowed: typeof rows = [];
  for (const row of rows) {
    const ok = await contextSyncAccessAllowed({
      db,
      userId: input.userId,
      organizationId: input.organizationId,
      artifactUri: row.uri,
      actor: input.actor,
      effectiveActor,
      operation: "read",
      preloadScopedGrants: scopedGrants,
    });
    if (ok) allowed.push(row);
  }
  return allowed;
}

export async function contextSyncCreateGrant(
  db: Db,
  input: {
    userId: string;
    organizationId: string;
    actorId?: string | null;
    agentClass?: string | null;
    artifactPattern: string;
    operations: string[];
  },
) {
  await requirePermission(db, input.userId, input.organizationId, PERMISSIONS.ORG_ADMIN);

  const member = await assertOrgMembership(db, input.userId, input.organizationId);
  if (!member) {
    throw new ContextSyncError(403, { error: "forbidden", reason: "not_org_member" });
  }

  if (
    (input.actorId && input.agentClass) ||
    (!input.actorId && !input.agentClass)
  ) {
    throw new ContextSyncError(400, {
      error: "bad_request",
      message: "Exactly one of actor_id or agent_class is required",
    });
  }

  const [row] = await db
    .insert(contextSyncGrant)
    .values({
      organizationId: input.organizationId,
      actorId: input.actorId ?? null,
      agentClass: input.agentClass ?? null,
      artifactPattern: input.artifactPattern,
      operations: input.operations,
      createdByUserId: input.userId,
    })
    .returning();

  if (!row) {
    throw new ContextSyncError(500, { error: "internal" });
  }

  await writeAuditLog(db, {
    organizationId: input.organizationId,
    actorUserId: input.userId,
    action: "context_sync.grant.create",
    entityType: "context_sync_grant",
    entityId: row.id,
    payload: { pattern: input.artifactPattern },
  });

  return row;
}

export async function contextSyncRegisterActor(
  db: Db,
  input: {
    userId: string;
    organizationId: string;
    actorId: string;
    actorType: "human" | "agent";
    name: string;
    agentClass?: string | null;
  },
) {
  await requirePermission(db, input.userId, input.organizationId, PERMISSIONS.CONTEXT_WRITE);

  const member = await assertOrgMembership(db, input.userId, input.organizationId);
  if (!member) {
    throw new ContextSyncError(403, { error: "forbidden", reason: "not_org_member" });
  }

  if (input.actorType === "agent" && !input.agentClass) {
    throw new ContextSyncError(400, {
      error: "bad_request",
      message: "agent_class is required for agent actors",
    });
  }

  try {
    const [row] = await db
      .insert(contextSyncActor)
      .values({
        organizationId: input.organizationId,
        actorId: input.actorId,
        actorType: input.actorType,
        name: input.name,
        agentClass: input.agentClass ?? null,
      })
      .returning();

    if (!row) {
      throw new ContextSyncError(500, { error: "internal" });
    }

    await writeAuditLog(db, {
      organizationId: input.organizationId,
      actorUserId: input.userId,
      action: "context_sync.actor.create",
      entityType: "context_sync_actor",
      entityId: `${input.organizationId}:${input.actorId}`,
      payload: {},
    });

    return row;
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "23505"
    ) {
      throw new ContextSyncError(409, {
        error: "conflict",
        message: "Actor already exists",
      });
    }
    throw e;
  }
}

export async function contextSyncListActors(
  db: Db,
  input: { userId: string; organizationId: string },
) {
  await requirePermission(db, input.userId, input.organizationId, PERMISSIONS.CONTEXT_READ);
  const member = await assertOrgMembership(db, input.userId, input.organizationId);
  if (!member) {
    throw new ContextSyncError(403, { error: "forbidden", reason: "not_org_member" });
  }

  return db
    .select()
    .from(contextSyncActor)
    .where(eq(contextSyncActor.organizationId, input.organizationId))
    .orderBy(asc(contextSyncActor.actorId));
}

export async function contextSyncGetActor(
  db: Db,
  input: { userId: string; organizationId: string; actorId: string },
) {
  await requirePermission(db, input.userId, input.organizationId, PERMISSIONS.CONTEXT_READ);
  const member = await assertOrgMembership(db, input.userId, input.organizationId);
  if (!member) {
    throw new ContextSyncError(403, { error: "forbidden", reason: "not_org_member" });
  }

  const [row] = await db
    .select()
    .from(contextSyncActor)
    .where(
      and(
        eq(contextSyncActor.organizationId, input.organizationId),
        eq(contextSyncActor.actorId, input.actorId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ContextSyncError(404, { error: "not_found", message: "Actor not found" });
  }
  return row;
}

export async function contextSyncQueryProvenance(
  db: Db,
  input: {
    userId: string;
    organizationId: string;
    artifactUri?: string | null;
    actorId?: string | null;
    limit: number;
  },
) {
  await requirePermission(db, input.userId, input.organizationId, PERMISSIONS.CONTEXT_READ);
  const member = await assertOrgMembership(db, input.userId, input.organizationId);
  if (!member) {
    throw new ContextSyncError(403, { error: "forbidden", reason: "not_org_member" });
  }

  const lim = Math.min(input.limit, 500);
  const rows = await db
    .select()
    .from(contextSyncProvenance)
    .where(
      and(
        eq(contextSyncProvenance.organizationId, input.organizationId),
        input.artifactUri
          ? eq(contextSyncProvenance.artifactUri, input.artifactUri)
          : sql`true`,
        input.actorId
          ? eq(contextSyncProvenance.actorId, input.actorId)
          : sql`true`,
      ),
    )
    .orderBy(desc(contextSyncProvenance.createdAt))
    .limit(lim);

  return rows;
}

export type { ContextSyncErrorBody } from "./errors";
export { ContextSyncError } from "./errors";
