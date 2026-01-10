-- db/migrations/2026-01-10_prepare_tenant_backfill.sql
-- 1) Ensure tenant columns exist (idempotent)
ALTER TABLE IF EXISTS product_ingestions ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE IF EXISTS product_ingestions ADD COLUMN IF NOT EXISTS org_id uuid;

-- 2) Audit table for rows we couldn't auto-resolve
CREATE TABLE IF NOT EXISTS ingestion_tenant_backfill_audit (
  ingestion_id uuid PRIMARY KEY,
  reason text NOT NULL,
  details jsonb NULL,
  created_at timestamptz DEFAULT now()
);

-- 3) Simple migration audit log (optional)
CREATE TABLE IF NOT EXISTS migration_audit (
  id serial PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

INSERT INTO migration_audit (name) VALUES ('prepare_tenant_backfill_2026_01_10');
