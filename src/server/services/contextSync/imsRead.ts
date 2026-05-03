import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import {
  controlledDocument,
  policyRevision,
  policyStatement,
  ragSource,
} from "@/server/db/schema";
import { ContextSyncError } from "./errors";
import type { ParsedImsLinked } from "./imsLinkedUri";

export type ImsReadSnapshot = {
  name: string;
  content: string;
  contentType: string;
  ims: {
    source: ParsedImsLinked["kind"];
    id: string;
    version_label?: string | null;
    policy_statement_id?: string | null;
  };
  artifactTimestamps: { createdAt: Date; updatedAt: Date };
  versionStamp: number;
};

export function imsVersionStamp(label: string, updatedAt: Date): number {
  const h = createHash("sha256").update(`${label}\n${updatedAt.toISOString()}`, "utf8").digest();
  const n = h.readUint32BE(0);
  return (n >>> 0) % 2_000_000_000;
}

export async function loadImsLinkedSnapshot(
  db: Db,
  organizationId: string,
  ims: ParsedImsLinked,
): Promise<ImsReadSnapshot> {
  switch (ims.kind) {
    case "policy_revision": {
      const [row] = await db
        .select({
          body: policyRevision.body,
          versionLabel: policyRevision.versionLabel,
          summary: policyRevision.summary,
          policyStatementId: policyRevision.policyStatementId,
          createdAt: policyRevision.createdAt,
          title: policyStatement.title,
        })
        .from(policyRevision)
        .innerJoin(policyStatement, eq(policyStatement.id, policyRevision.policyStatementId))
        .where(
          and(
            eq(policyRevision.id, ims.id),
            eq(policyRevision.organizationId, organizationId),
          ),
        )
        .limit(1);

      if (!row) {
        throw new ContextSyncError(404, {
          error: "not_found",
          message: "Policy revision not found in organization",
        });
      }

      const content = row.body;
      const updatedAt = row.createdAt;

      return {
        name: row.title,
        content,
        contentType: "text/plain",
        ims: {
          source: ims.kind,
          id: ims.id,
          version_label: row.versionLabel,
          policy_statement_id: row.policyStatementId,
        },
        artifactTimestamps: { createdAt: updatedAt, updatedAt },
        versionStamp: imsVersionStamp(`${row.versionLabel}:${row.summary ?? ""}`, updatedAt),
      };
    }

    case "rag_source": {
      const [row] = await db
        .select()
        .from(ragSource)
        .where(and(eq(ragSource.id, ims.id), eq(ragSource.organizationId, organizationId)))
        .limit(1);

      if (!row) {
        throw new ContextSyncError(404, {
          error: "not_found",
          message: "RAG source not found in organization",
        });
      }

      const raw = row.rawText ?? "";
      const updatedAt = row.updatedAt ?? row.createdAt;

      return {
        name: row.title,
        content: raw,
        contentType: row.mimeType ?? "text/plain",
        ims: { source: ims.kind, id: ims.id },
        artifactTimestamps: { createdAt: row.createdAt, updatedAt },
        versionStamp: imsVersionStamp(`${row.title}:${raw.length}`, updatedAt),
      };
    }

    case "controlled_document": {
      const [row] = await db
        .select()
        .from(controlledDocument)
        .where(
          and(
            eq(controlledDocument.id, ims.id),
            eq(controlledDocument.organizationId, organizationId),
          ),
        )
        .limit(1);

      if (!row) {
        throw new ContextSyncError(404, {
          error: "not_found",
          message: "Controlled document not found in organization",
        });
      }

      const payload = {
        id: row.id,
        title: row.title,
        document_number: row.documentNumber,
        revision: row.revision,
        status: row.status,
        effective_date: row.effectiveDate?.toISOString() ?? null,
        evidence_url: row.evidenceUrl,
        retention_note: row.retentionNote,
        legal_hold: row.legalHold,
        approved_at: row.approvedAt?.toISOString() ?? null,
      };
      const content = `${JSON.stringify(payload, null, 2)}\n`;
      const updatedAt = row.updatedAt;

      return {
        name: row.title,
        content,
        contentType: "application/json",
        ims: { source: ims.kind, id: ims.id },
        artifactTimestamps: { createdAt: row.createdAt, updatedAt },
        versionStamp: imsVersionStamp(`${row.documentNumber}:${row.revision}`, updatedAt),
      };
    }
  }

  throw new ContextSyncError(500, {
    error: "internal",
    message: "Unhandled IMS link kind.",
  });
}

export async function loadImsPolicyRevisionHistory(db: Db, organizationId: string, revisionId: string) {
  const [seed] = await db
    .select({ statementId: policyRevision.policyStatementId })
    .from(policyRevision)
    .where(
      and(eq(policyRevision.id, revisionId), eq(policyRevision.organizationId, organizationId)),
    )
    .limit(1);

  if (!seed) {
    throw new ContextSyncError(404, {
      error: "not_found",
      message: "Policy revision not found",
    });
  }

  const rows = await db
    .select({
      id: policyRevision.id,
      versionLabel: policyRevision.versionLabel,
      summary: policyRevision.summary,
      status: policyRevision.status,
      createdAt: policyRevision.createdAt,
    })
    .from(policyRevision)
    .where(
      and(
        eq(policyRevision.policyStatementId, seed.statementId),
        eq(policyRevision.organizationId, organizationId),
      ),
    )
    .orderBy(desc(policyRevision.createdAt));

  return rows.map((r) => ({
    id: r.id,
    version_label: r.versionLabel,
    summary: r.summary ?? null,
    status: r.status,
    created_at: r.createdAt.toISOString(),
    version_stamp: imsVersionStamp(`${r.versionLabel}:${r.summary ?? ""}`, r.createdAt),
  }));
}
