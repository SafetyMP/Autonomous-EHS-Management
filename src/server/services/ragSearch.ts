import { and, desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { RAG_EMBEDDING_DIM } from "@/lib/rag/embeddingDim";
import { cosineSimilarity } from "@/lib/rag/cosineSimilarity";
import { escapeIlikePattern } from "@/lib/rag/chunkText";
import { ragChunk, ragSource } from "@/server/db/schema";

/** Re-export for callers that already import from this module. */
export { RAG_EMBEDDING_DIM } from "@/lib/rag/embeddingDim";

/** Reciprocal rank fusion smoothing constant (typical default ~60). */
export const RAG_RRF_K = 60;

export type RagSearchInput = {
  organizationId: string;
  query: string;
  limit?: number;
  programTag?: string;
  /** When length is 1536 (`RAG_EMBEDDING_DIM`), uses pgvector when rows have vectors. */
  queryEmbedding?: number[];
};

export type RagSearchHit = {
  chunkId: string;
  chunkIndex: number;
  excerpt: string;
  sourceId: string;
  sourceTitle: string;
  sourceUri: string | null;
  programTag: string | null;
  topicTags: string[];
  citation: string;
  vectorScore: number | null;
};

type ChunkRowBase = {
  chunkId: string;
  chunkIndex: number;
  excerpt: string;
  sourceId: string;
  sourceTitle: string;
  sourceUri: string | null;
  programTag: string | null;
  topicTags: string[];
};

/**
 * INVARIANT: `embedding` must be finite numbers only (callers validate with Zod).
 * Never pass strings or loosened types into this `sql.raw` literal — it would reintroduce SQL injection risk.
 */
function vectorLiteral(embedding: number[]): ReturnType<typeof sql> {
  const inner = embedding
    .map((n) => (Number.isFinite(n) ? String(n) : "0"))
    .join(",");
  return sql.raw(`'[${inner}]'::vector`);
}

function citationFor(r: {
  sourceTitle: string;
  chunkIndex: number;
  sourceUri: string | null;
}) {
  return `${r.sourceTitle} § chunk ${r.chunkIndex}${r.sourceUri ? ` (${r.sourceUri})` : ""}`;
}

/** Exported for unit tests — merges ranked vector and lexical lists via RRF. */
export function mergeLexicalVectorRrf(args: {
  vectorRows: Array<ChunkRowBase & { distance: number }>;
  lexicalRows: ChunkRowBase[];
  limit: number;
  rrfK?: number;
}): RagSearchHit[] {
  const k = args.rrfK ?? RAG_RRF_K;
  const merged = new Map<
    string,
    { base: ChunkRowBase; vRank?: number; lRank?: number; distance?: number }
  >();

  args.vectorRows.forEach((r, i) => {
    const { distance, ...base } = r;
    merged.set(r.chunkId, {
      base,
      vRank: i + 1,
      distance: Number(distance),
    });
  });

  args.lexicalRows.forEach((r, i) => {
    const ex = merged.get(r.chunkId);
    if (ex) {
      ex.lRank = i + 1;
    } else {
      merged.set(r.chunkId, { base: r, lRank: i + 1 });
    }
  });

  const scored = [...merged.values()].map((acc) => {
    let rrf = 0;
    if (acc.vRank) rrf += 1 / (k + acc.vRank);
    if (acc.lRank) rrf += 1 / (k + acc.lRank);
    const vectorScore = acc.distance !== undefined ? 1 - acc.distance : null;
    return { acc, rrf, vectorScore };
  });

  scored.sort((a, b) => {
    if (b.rrf !== a.rrf) return b.rrf - a.rrf;
    const da = a.acc.distance ?? 1;
    const db = b.acc.distance ?? 1;
    return da - db;
  });

  return scored.slice(0, args.limit).map(({ acc, vectorScore }) => ({
    chunkId: acc.base.chunkId,
    chunkIndex: acc.base.chunkIndex,
    excerpt: acc.base.excerpt,
    sourceId: acc.base.sourceId,
    sourceTitle: acc.base.sourceTitle,
    sourceUri: acc.base.sourceUri,
    programTag: acc.base.programTag,
    topicTags: acc.base.topicTags,
    citation: citationFor(acc.base),
    vectorScore,
  }));
}

/**
 * Permission checks are the caller's responsibility (tRPC `assertPermission`).
 */
export async function searchRagChunks(db: Db, input: RagSearchInput): Promise<RagSearchHit[]> {
  const pattern = `%${escapeIlikePattern(input.query)}%`;
  const limit = input.limit ?? 20;
  const qEmb = input.queryEmbedding;

  const usePgVector = !!qEmb && qEmb.length === RAG_EMBEDDING_DIM;

  if (usePgVector) {
    const pool = Math.min(80, Math.max(limit * 4, 40));
    const lit = vectorLiteral(qEmb);
    const distanceExpr = sql<number>`(${ragChunk.embeddingVector} <=> ${lit})`;
    const vecFilters = [
      eq(ragChunk.organizationId, input.organizationId),
      isNotNull(ragChunk.embeddingVector),
    ];
    if (input.programTag) {
      vecFilters.push(eq(ragSource.programTag, input.programTag));
    }

    const vectorRows = await db
      .select({
        chunkId: ragChunk.id,
        chunkIndex: ragChunk.chunkIndex,
        excerpt: ragChunk.content,
        sourceId: ragSource.id,
        sourceTitle: ragSource.title,
        sourceUri: ragSource.sourceUri,
        programTag: ragSource.programTag,
        topicTags: ragSource.topicTags,
        distance: distanceExpr,
      })
      .from(ragChunk)
      .innerJoin(ragSource, eq(ragChunk.sourceId, ragSource.id))
      .where(and(...vecFilters))
      .orderBy(distanceExpr)
      .limit(pool);

    const lexFilters = [
      eq(ragChunk.organizationId, input.organizationId),
      or(ilike(ragChunk.content, pattern), ilike(ragSource.title, pattern)),
    ];
    if (input.programTag) {
      lexFilters.push(eq(ragSource.programTag, input.programTag));
    }

    const lexicalRows = await db
      .select({
        chunkId: ragChunk.id,
        chunkIndex: ragChunk.chunkIndex,
        excerpt: ragChunk.content,
        sourceId: ragSource.id,
        sourceTitle: ragSource.title,
        sourceUri: ragSource.sourceUri,
        programTag: ragSource.programTag,
        topicTags: ragSource.topicTags,
      })
      .from(ragChunk)
      .innerJoin(ragSource, eq(ragChunk.sourceId, ragSource.id))
      .where(and(...lexFilters))
      .orderBy(desc(ragChunk.createdAt))
      .limit(pool);

    if (vectorRows.length === 0 && lexicalRows.length === 0) {
      return [];
    }

    if (vectorRows.length === 0) {
      return lexicalRows.slice(0, limit).map((r) => ({
        chunkId: r.chunkId,
        chunkIndex: r.chunkIndex,
        excerpt: r.excerpt,
        sourceId: r.sourceId,
        sourceTitle: r.sourceTitle,
        sourceUri: r.sourceUri,
        programTag: r.programTag,
        topicTags: r.topicTags,
        citation: citationFor(r),
        vectorScore: null,
      }));
    }

    return mergeLexicalVectorRrf({
      vectorRows: vectorRows.map((r) => ({
        chunkId: r.chunkId,
        chunkIndex: r.chunkIndex,
        excerpt: r.excerpt,
        sourceId: r.sourceId,
        sourceTitle: r.sourceTitle,
        sourceUri: r.sourceUri,
        programTag: r.programTag,
        topicTags: r.topicTags,
        distance: Number(r.distance),
      })),
      lexicalRows: lexicalRows.map((r) => ({ ...r })),
      limit,
    });
  }

  const filters = [
    eq(ragChunk.organizationId, input.organizationId),
    or(ilike(ragChunk.content, pattern), ilike(ragSource.title, pattern)),
  ];
  if (input.programTag) {
    filters.push(eq(ragSource.programTag, input.programTag));
  }

  const rows = await db
    .select({
      chunkId: ragChunk.id,
      chunkIndex: ragChunk.chunkIndex,
      excerpt: ragChunk.content,
      sourceId: ragSource.id,
      sourceTitle: ragSource.title,
      sourceUri: ragSource.sourceUri,
      programTag: ragSource.programTag,
      topicTags: ragSource.topicTags,
      embedding: ragChunk.embedding,
    })
    .from(ragChunk)
    .innerJoin(ragSource, eq(ragChunk.sourceId, ragSource.id))
    .where(and(...filters))
    .orderBy(desc(ragChunk.createdAt))
    .limit(qEmb?.length ? Math.min(limit * 4, 80) : limit);

  let ranked: RagSearchHit[] = rows.map((r) => ({
    chunkId: r.chunkId,
    chunkIndex: r.chunkIndex,
    excerpt: r.excerpt,
    sourceId: r.sourceId,
    sourceTitle: r.sourceTitle,
    sourceUri: r.sourceUri,
    programTag: r.programTag,
    topicTags: r.topicTags,
    citation: citationFor(r),
    vectorScore: null as number | null,
  }));

  if (qEmb?.length) {
    const queryEmbedding = qEmb;
    const firstEmbeddingByChunk = new Map<
      string,
      (typeof rows)[number]["embedding"]
    >();
    for (const r of rows) {
      if (!firstEmbeddingByChunk.has(r.chunkId)) {
        firstEmbeddingByChunk.set(r.chunkId, r.embedding);
      }
    }
    ranked = ranked
      .map((r) => {
        const emb = firstEmbeddingByChunk.get(r.chunkId);
        const vectorScore =
          emb && emb.length === queryEmbedding.length
            ? cosineSimilarity(emb, queryEmbedding)
            : null;
        return { ...r, vectorScore };
      })
      .sort((a, b) => (b.vectorScore ?? -1) - (a.vectorScore ?? -1))
      .slice(0, limit);
  }

  return ranked;
}
