-- Migration: Add import_jobs/import_rows and tenant columns expected by the import runner
-- Safe / idempotent: uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS where available.
-- Run this in Supabase SQL editor (service-role) or with psql as a privileged user.

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
  file_format text,
  total_rows int DEFAULT 0,
  processed_rows int DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  result_summary jsonb DEFAULT '{}'::jsonb,
  errors jsonb DEFAULT '[]'::jsonb,
  meta jsonb DEFAULT '{}'::jsonb,
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
  status text DEFAULT 'pending',
  errors jsonb DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS import_rows_job_idx ON import_rows (job_id);

-- 4) ecommerce_connections table (minimal compatible schema)
CREATE TABLE IF NOT EXISTS ecommerce_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  platform text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secrets_enc text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_connections_tenant_platform
  ON ecommerce_connections (tenant_id, platform);

-- 5) set_updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6) Attach triggers to keep updated_at in sync (safe: DROP IF EXISTS then CREATE)
DROP TRIGGER IF EXISTS trg_import_jobs_updated_at ON import_jobs;
CREATE TRIGGER trg_import_jobs_updated_at
BEFORE UPDATE ON import_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ecommerce_connections_updated_at ON ecommerce_connections;
CREATE TRIGGER trg_ecommerce_connections_updated_at
BEFORE UPDATE ON ecommerce_connections
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMIT;
