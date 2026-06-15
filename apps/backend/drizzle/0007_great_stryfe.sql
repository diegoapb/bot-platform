-- Requiere la extensión pgvector en la DB. Se crea una sola vez como superuser
-- (no como el user de app) vía SSH al host, antes de migrar:
--   docker exec <labs-vector> psql -U <superuser> -d <db> -c 'CREATE EXTENSION IF NOT EXISTS vector;'
-- El USING castea los embeddings jsonb existentes (formato "[1, 2, ...]") a vector,
-- así la migración es segura tanto en una DB vacía (prod) como con datos (dev).
ALTER TABLE "knowledge_chunks" ALTER COLUMN "embedding" SET DATA TYPE vector(1536) USING "embedding"::text::vector(1536);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_chunks_embedding_hnsw" ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);
