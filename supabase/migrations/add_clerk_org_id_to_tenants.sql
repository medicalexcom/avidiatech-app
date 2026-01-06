-- Migration: add clerk_org_id to tenants and create a safe unique index
-- Run in your Supabase / Postgres migration runner.
-- This file is written to be idempotent: it will not fail if the column or index already exist.

-- 1) Add nullable clerk_org_id column if missing
ALTER TABLE IF EXISTS tenants
ADD COLUMN IF NOT EXISTS clerk_org_id text NULL;

-- 2) Create a case-insensitive unique index on clerk_org_id (partial so NULLs allowed).
-- Use a DO block to create the index only if it doesn't already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_tenants_clerk_org_id_unique'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_tenants_clerk_org_id_unique ON tenants (lower(clerk_org_id)) WHERE clerk_org_id IS NOT NULL';
  END IF;
END
$$;
