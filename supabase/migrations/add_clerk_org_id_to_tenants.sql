-- Migration: add clerk_org_id to tenants and safe unique index
-- Run on your DB (preferably in staging first).
-- This migration is reversible (drop index + column).

BEGIN;

-- 1) Add nullable column to store Clerk org id mapped to your tenant
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS clerk_org_id text NULL;

-- 2) Create a unique index to prevent duplicate mappings (case-insensitive).
-- Use a partial index to allow multiple NULLs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_tenants_clerk_org_id_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_tenants_clerk_org_id_unique ON tenants (lower(clerk_org_id)) WHERE clerk_org_id IS NOT NULL;
  END IF;
END$$;

COMMIT;

