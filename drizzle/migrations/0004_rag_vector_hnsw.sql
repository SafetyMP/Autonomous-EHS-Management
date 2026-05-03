CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rag_chunk_embedding_vector_hnsw_idx" ON "rag_chunk" USING hnsw ("embedding_vector" vector_cosine_ops) WHERE "embedding_vector" IS NOT NULL;
