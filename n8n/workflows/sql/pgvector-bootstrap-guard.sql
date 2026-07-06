-- Bootstrap guard for the KB CRUD workflows.
--
-- The n8n "Postgres PGVector Store" node creates the vector tables lazily, on
-- the first insert -- which runs AFTER the pre-insert duplicate/list/delete
-- checks. On a brand-new deployment (empty knowledge base) those checks run
-- before any table exists and fail with:
--     relation "n8n_vector_collections" does not exist
-- A pure to_regclass/CASE guard cannot fix this: Postgres resolves every table
-- name at parse time, so a statement that merely mentions the table fails.
--
-- Fix: ensure the tables exist before the check. Schema mirrors
-- @langchain/community PGVectorStore exactly (gen_random_uuid PKs, content
-- column "text", collection_id on the embeddings table). All statements are
-- IF NOT EXISTS, so this is a no-op on any deployment that already has data,
-- and the node's own lazy creation later becomes a harmless no-op.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS n8n_vector_collections (
  uuid uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name character varying,
  cmetadata jsonb
);

CREATE TABLE IF NOT EXISTS n8n_vectors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text text,
  metadata jsonb,
  embedding vector,
  collection_id uuid
);
