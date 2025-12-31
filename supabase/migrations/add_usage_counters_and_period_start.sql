-- idempotent migration: ensure usage_counters exists and has period_start column
-- 2025-12-31: create/ensure usage_counters table and period_start column
-- Safe to run multiple times.

BEGIN;

-- 1) Ensure pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Create usage_counters table if it does not already exist.
-- Use tenant_id as text for maximum compatibility with existing synthetic tenant ids.
CREATE TABLE IF NOT EXISTS usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  period_start timestamptz,
  usage_count bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3) Ensure unique index/constraint on tenant_id exists (match earlier constraint name if present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND c.relname = 'usage_counters'
  ) THEN
    RAISE NOTICE 'usage_counters table not found - created above';
  END IF;

  -- Add unique constraint if not present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usage_counters_tenant_id_key'
  ) THEN
    BEGIN
      ALTER TABLE usage_counters ADD CONSTRAINT usage_counters_tenant_id_key UNIQUE (tenant_id);
    EXCEPTION WHEN duplicate_object THEN
      -- ignore if race/exists
      RAISE NOTICE 'usage_counters_tenant_id_key already exists (race)';
    END;
  END IF;
END
$$;

-- 4) Add period_start column if missing (idempotent)
ALTER TABLE usage_counters ADD COLUMN IF NOT EXISTS period_start timestamptz;

-- 5) Backfill period_start for existing rows
-- Prefer created_at if available; otherwise use now()
UPDATE usage_counters
SET period_start = COALESCE(period_start, created_at, now())
WHERE period_start IS NULL;

-- 6) Ensure an updated_at trigger exists so rows get updated_at auto-updated
CREATE OR REPLACE FUNCTION _usage_counters_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usage_counters_set_updated_at ON usage_counters;
CREATE TRIGGER trg_usage_counters_set_updated_at
BEFORE UPDATE ON usage_counters
FOR EACH ROW
EXECUTE FUNCTION _usage_counters_set_updated_at();

COMMIT;
