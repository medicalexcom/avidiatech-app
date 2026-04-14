-- Add tenant-level setting: monitor_all (default true)
-- Idempotent.

BEGIN;

ALTER TABLE IF EXISTS public.tenants
  ADD COLUMN IF NOT EXISTS monitor_all boolean NOT NULL DEFAULT true;

COMMIT;
