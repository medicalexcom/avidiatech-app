-- Migration: Add import_jobs/import_rows and tenant columns expected by the import runner
-- Run this using your Supabase SQL editor (service-role) or psql against the app database.
-- Safe / idempotent: uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS where available.

-- Ensure gen_random_uuid() is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

-- 1) Add tenant/org columns to product_ingestions (defensive: only add if missing)
ALTER TABLE IF EXISTS product_ingestions
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 2) import_jobs table: tracks an import file/run and overall status
CREATE TABLE IF NOT EXISTS import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  created_by uuid NOT NULL,
  file_path text,
  file_name text,
  file_format text,                   -- csv | xlsx | json etc
  total_rows int DEFAULT 0,
  processed_rows int DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending|processing|complete|failed
  result_summary jsonb DEFAULT '{}'::jsonb, -- { successes: n, failures: n }
  errors jsonb DEFAULT '[]'::jsonb,   -- array of global errors / messages
  meta jsonb DEFAULT '{}'::jsonb,     -- freeform meta (ingestionId, connector_id, etc.)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS import_jobs_org_id_idx ON import_jobs (org_id);

-- 3) import_rows table: optional row-level details and errors
CREATE TABLE IF NOT EXISTS import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number int,
  data jsonb,
  status text DEFAULT 'pending', -- pending|success|failed
  errors jsonb DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS import_rows_job_idx ON import_rows (job_id);

-- 4) ecommerce_connections table (defensive: only create if missing)
-- This is a minimal compatible schema used by the app. If your project already has this table,
-- CREATE TABLE IF NOT EXISTS will do nothing; indexes/triggers below will also be skipped if already present.
CREATE TABLE IF NOT EXISTS ecommerce_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  platform text NOT NULL, -- e.g. 'bigcommerce'
  status text NOT NULL DEFAULT 'active',
  config jsonb NOT NULL DEFAULT '{}'::jsonb, -- non-sensitive config (store_hash etc.)
  secrets_enc text NOT NULL,                -- encrypted token blob (base64/utf-8)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_connections_tenant_platform
  ON ecommerce_connections (tenant_id, platform);

-- 5) set_updated_at trigger helper (create or replace is safe)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to keep updated_at in sync for tables that have that column.
-- If trigger already exists, DROP then CREATE (harmless if present).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'import_jobs') THEN
    PERFORM (
      CASE
        WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_import_jobs_updated_at') THEN
          pg_catalog.execute('DROP TRIGGER trg_import_jobs_updated_at ON import_jobs');
      END
    );
    EXECUTE 'CREATE TRIGGER trg_import_jobs_updated_at BEFORE UPDATE ON import_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'ecommerce_connections') THEN
    PERFORM (
      CASE
        WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_ecommerce_connections_updated_at') THEN
          pg_catalog.execute('DROP TRIGGER trg_ecommerce_connections_updated_at ON ecommerce_connections');
      END
    );
    EXECUTE 'CREATE TRIGGER trg_ecommerce_connections_updated_at BEFORE UPDATE ON ecommerce_connections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
  END IF;
END
$$ LANGUAGE plpgsql;

COMMIT;
