-- db/migrations/2026-01-10_allow_null_tenant_product_ingestions.sql
-- Purpose: temporarily allow NULL tenant_id / org_id to avoid ingestion creation failures
-- caused by callers that do not supply tenant. This is a short-term unblock.
--
-- After you deploy ingestion creation changes that guarantee tenant on insert (or use
-- a configured fallback), backfill and then run a migration to set NOT NULL again.

-- 1) Make columns nullable (drop NOT NULL)
ALTER TABLE IF EXISTS product_ingestions
  ALTER COLUMN tenant_id DROP NOT NULL,
  ALTER COLUMN org_id DROP NOT NULL;

-- 2) Optional: add an audit record to note this change
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_audit') THEN
    CREATE TABLE migration_audit (
      id serial PRIMARY KEY,
      name text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  END IF;

  INSERT INTO migration_audit (name) VALUES ('allow_null_tenant_product_ingestions_2026_01_10');
END$$;
