import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getAiGateway } from "@/lib/ai/gateway";
import { redactForRagIngest } from "@/lib/pii/redact";
import { PERMISSIONS, assertPermission } from "@/lib/rbac";
import { isSafeHttpUrl } from "@/lib/safe-http-url";
import { ragChunk, ragSource, site } from "@/server/db/schema";
import { chunkText } from "@/lib/rag/chunkText";
import {
  RAG_EMBEDDING_DIM,
  searchRagChunks,
} from "@/server/services/ragSearch";
import { writeAuditLog } from "@/server/services/audit";
import { rateLimitOrThrow } from "@/server/ratelimit";
import { orgScope } from "../schemas/orgScope";
import { protectedMutation, protectedProcedure, router } from "../init";

const sourceUriSchema = z
  .string()
  .max(2048)
  .url()
  .refine(isSafeHttpUrl, "Source URI must use HTTP or HTTPS.");

export const ragRouter = router({
  listSources: protectedProcedure.input(orgScope).query(async ({ ctx, input }) => {
    await assertPermission(
      ctx.db,
      ctx.user.id,
      input.organizationId,
      PERMISSIONS.RAG_READ,
    );

    return ctx.db
      .select()
      .from(ragSource)
      .where(eq(ragSource.organizationId, input.organizationId))
      .orderBy(desc(ragSource.updatedAt));
  }),

  /**
   * Single-query embedding for semantic search (`queryEmbedding` on `search`).
   * Returns null when the AI gateway is unavailable or dimensions mismatch.
   */
  embedQuery: protectedProcedure
    .input(
      orgScope.extend({
        text: z.string().min(2).max(512),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.RAG_READ,
      );
      await rateLimitOrThrow(`${ctx.ip}:rag.embedQuery:${ctx.user.id}`);

      try {
        const gateway = getAiGateway();
        const batch = await gateway.embedTexts({ texts: [input.text] });
        const emb = batch[0];
        if (!emb || emb.length !== RAG_EMBEDDING_DIM) {
          return { embedding: null as number[] | null };
        }
        return { embedding: emb };
      } catch {
        return { embedding: null as number[] | null };
      }
    }),

  search: protectedProcedure
    .input(
      orgScope.extend({
        query: z.string().min(2).max(512),
        limit: z.number().int().min(1).max(50).optional(),
        programTag: z.string().max(64).optional(),
        queryEmbedding: z.array(z.number().finite()).max(4096).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.RAG_READ,
      );

      return searchRagChunks(ctx.db, {
        organizationId: input.organizationId,
        query: input.query,
        limit: input.limit,
        programTag: input.programTag,
        queryEmbedding: input.queryEmbedding,
      });
    }),

  /** Embed chunks missing `embedding_vector` (requires AI gateway). */
  backfillEmbeddings: protectedMutation
    .input(
      orgScope.extend({
        limit: z.number().int().min(1).max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.RAG_INGEST,
      );

      let gateway;
      try {
        gateway = getAiGateway();
      } catch {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "AI gateway is not configured; cannot embed chunks.",
        });
      }

      const take = input.limit ?? 100;
      const rows = await ctx.db
        .select({
          id: ragChunk.id,
          content: ragChunk.content,
        })
        .from(ragChunk)
        .where(
          and(
            eq(ragChunk.organizationId, input.organizationId),
            isNull(ragChunk.embeddingVector),
          ),
        )
        .limit(take);

      if (rows.length === 0) {
        return { updated: 0 };
      }

      const embeddings = await gateway.embedTexts({
        texts: rows.map((r) => r.content),
      });

      if (embeddings.length !== rows.length) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Embedding API returned unexpected batch size.",
        });
      }

      let updated = 0;
      await ctx.db.transaction(async (tx) => {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]!;
          const emb = embeddings[i]!;
          if (emb.length !== RAG_EMBEDDING_DIM) {
            continue;
          }
          await tx
            .update(ragChunk)
            .set({
              embedding: emb,
              embeddingVector: emb,
            })
            .where(
              and(eq(ragChunk.id, row.id), eq(ragChunk.organizationId, input.organizationId)),
            );
          updated += 1;
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "rag.backfill_embeddings",
          entityType: "rag_chunk",
          entityId: rows[0]!.id,
          payload: { requested: rows.length, updated },
        });
      });

      return { updated };
    }),

  ingest: protectedMutation
    .input(
      orgScope.extend({
        title: z.string().min(2).max(512),
        rawText: z.string().min(1).max(500_000),
        sourceUri: sourceUriSchema.optional(),
        siteId: z.string().uuid().optional(),
        programTag: z.string().max(64).optional(),
        topicTags: z.array(z.string().max(128)).max(32).optional(),
        mimeType: z.string().max(128).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.RAG_INGEST,
      );

      if (input.siteId) {
        const [s] = await ctx.db
          .select()
          .from(site)
          .where(
            and(eq(site.id, input.siteId), eq(site.organizationId, input.organizationId)),
          )
          .limit(1);
        if (!s) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Site does not belong to organization.",
          });
        }
      }

      const safeRaw = redactForRagIngest(input.rawText);
      const pieces = chunkText(safeRaw);
      if (pieces.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No ingestable text after chunking.",
        });
      }

      let embeddings: number[][] | null = null;
      try {
        embeddings = await getAiGateway().embedTexts({ texts: pieces });
      } catch {
        embeddings = null;
      }

      if (embeddings && embeddings.length !== pieces.length) {
        embeddings = null;
      }

      return ctx.db.transaction(async (tx) => {
        const [src] = await tx
          .insert(ragSource)
          .values({
            organizationId: input.organizationId,
            siteId: input.siteId ?? null,
            title: input.title,
            sourceUri: input.sourceUri ?? null,
            programTag: input.programTag ?? null,
            topicTags: input.topicTags ?? [],
            rawText: safeRaw,
            mimeType: input.mimeType ?? "text/plain",
            status: "ready",
          })
          .returning();

        if (!src) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create RAG source.",
          });
        }

        await tx.insert(ragChunk).values(
          pieces.map((content, i) => {
            const emb = embeddings?.[i];
            const ok = emb && emb.length === RAG_EMBEDDING_DIM;
            return {
              organizationId: input.organizationId,
              sourceId: src.id,
              chunkIndex: i,
              content,
              embedding: ok ? emb : null,
              embeddingVector: ok ? emb : null,
              meta: {},
            };
          }),
        );

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "rag.ingest",
          entityType: "rag_source",
          entityId: src.id,
          payload: {
            title: input.title,
            chunks: pieces.length,
            embedded: Boolean(embeddings),
          },
        });

        return { sourceId: src.id, chunkCount: pieces.length };
      });
    }),

  /**
   * Apply current `redactForRagIngest` to stored `raw_text` and each chunk. Clears
   * chunk embeddings when chunk text changes (re-run `backfillEmbeddings`).
   */
  redactExistingSource: protectedMutation
    .input(
      orgScope.extend({
        sourceId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertPermission(
        ctx.db,
        ctx.user.id,
        input.organizationId,
        PERMISSIONS.RAG_INGEST,
      );
      await rateLimitOrThrow(`${ctx.ip}:rag.redactExistingSource:${ctx.user.id}`);

      const [src] = await ctx.db
        .select()
        .from(ragSource)
        .where(
          and(
            eq(ragSource.id, input.sourceId),
            eq(ragSource.organizationId, input.organizationId),
          ),
        )
        .limit(1);

      if (!src) {
        throw new TRPCError({ code: "NOT_FOUND", message: "RAG source not found." });
      }

      const chunks = await ctx.db
        .select()
        .from(ragChunk)
        .where(
          and(
            eq(ragChunk.sourceId, input.sourceId),
            eq(ragChunk.organizationId, input.organizationId),
          ),
        );

      return ctx.db.transaction(async (tx) => {
        const prevRaw = src.rawText ?? "";
        const safeRaw = redactForRagIngest(prevRaw);
        const rawChanged = safeRaw !== prevRaw;

        await tx
          .update(ragSource)
          .set({
            rawText: rawChanged ? safeRaw : src.rawText,
            updatedAt: new Date(),
          })
          .where(eq(ragSource.id, src.id));

        let chunksContentChanged = 0;
        let embeddingsCleared = 0;

        for (const c of chunks) {
          const safe = redactForRagIngest(c.content);
          const contentChanged = safe !== c.content;
          if (!contentChanged) {
            continue;
          }
          chunksContentChanged += 1;
          embeddingsCleared += 1;
          await tx
            .update(ragChunk)
            .set({
              content: safe,
              embedding: null,
              embeddingVector: null,
            })
            .where(
              and(eq(ragChunk.id, c.id), eq(ragChunk.organizationId, input.organizationId)),
            );
        }

        await writeAuditLog(tx, {
          organizationId: input.organizationId,
          actorUserId: ctx.user.id,
          action: "rag.redact_existing_source",
          entityType: "rag_source",
          entityId: src.id,
          payload: {
            chunksScanned: chunks.length,
            chunksContentChanged,
            rawTextChanged: rawChanged,
            embeddingsCleared,
          },
        });

        return {
          sourceId: src.id,
          chunksScanned: chunks.length,
          chunksContentChanged,
          rawTextChanged: rawChanged,
          embeddingsCleared,
        };
      });
    }),
});
