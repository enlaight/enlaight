-- Schema bootstrap for Enlaight KB workflows.
--
-- All eight knowledge-base workflows in `n8n/workflows/` read from and
-- write to `public.enlaight_knowledge_bases` in the `n8n_enlaight_db`
-- database created by `01-init-databases.sql`. Without this script the
-- workflows fail on every webhook call with:
--   relation "enlaight_knowledge_bases" does not exist
--
-- The `vector` extension below is required by `add-file-kb.json`, which
-- uses the LangChain PGVector store. It must be created by a superuser;
-- the `n8n` role created in `01-init-databases.sql` does not have the
-- CREATE EXTENSION privilege. The `n8n_vectors` and `n8n_vector_collections`
-- tables themselves are created automatically by the LangChain node on
-- first ingestion, so no extra DDL is needed for them here.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.enlaight_knowledge_bases (
    id          SERIAL       PRIMARY KEY,
    hash_id     TEXT         UNIQUE NOT NULL,
    name        TEXT         NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Used by `create-kb.json` to check for duplicate names before insert.
CREATE INDEX IF NOT EXISTS idx_enlaight_kb_name
    ON public.enlaight_knowledge_bases (name);

-- Keep `updated_at` honest. `edit-kb.json` only writes `name`/`description`
-- in its UPDATE, so without a trigger the column would stagnate at the
-- creation timestamp.
CREATE OR REPLACE FUNCTION public.enlaight_kb_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enlaight_kb_updated_at
    ON public.enlaight_knowledge_bases;
CREATE TRIGGER trg_enlaight_kb_updated_at
    BEFORE UPDATE ON public.enlaight_knowledge_bases
    FOR EACH ROW
    EXECUTE FUNCTION public.enlaight_kb_touch_updated_at();
