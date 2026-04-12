-- 2026-04-12-billing-fixes.sql
-- Fixes required for the billing system to function correctly.
-- Safe to run multiple times (idempotent).

BEGIN;

-- ── 1. Ensure usage_counters has all required count columns ──────────────────
ALTER TABLE usage_counters ADD COLUMN IF NOT EXISTS ingestion_count integer NOT NULL DEFAULT 0;
ALTER TABLE usage_counters ADD COLUMN IF NOT EXISTS seo_count       integer NOT NULL DEFAULT 0;
ALTER TABLE usage_counters ADD COLUMN IF NOT EXISTS variants_count  integer NOT NULL DEFAULT 0;
ALTER TABLE usage_counters ADD COLUMN IF NOT EXISTS match_count     integer NOT NULL DEFAULT 0;

-- ── 2. Ensure tenant_subscriptions has all required columns ──────────────────
-- stripe_subscription_id: for reference / cancellation lookups
ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE tenant_subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id     text;

-- ── 3. Add unique constraint on tenant_id for upsert support ─────────────────
-- The webhook uses upsert(onConflict: "tenant_id") — requires this constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_subscriptions_tenant_id_key'
  ) THEN
    BEGIN
      ALTER TABLE tenant_subscriptions ADD CONSTRAINT tenant_subscriptions_tenant_id_key UNIQUE (tenant_id);
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'tenant_subscriptions_tenant_id_key already exists';
    END;
  END IF;
END
$$;

-- ── 4. Monthly usage reset function ──────────────────────────────────────────
-- Call this function via pg_cron (or manually) at the start of each billing cycle.
-- It resets usage_counters for tenants whose subscription period has rolled over.
CREATE OR REPLACE FUNCTION reset_usage_for_renewed_tenants()
RETURNS void AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  UPDATE usage_counters uc
  SET
    ingestion_count = 0,
    seo_count       = 0,
    variants_count  = 0,
    match_count     = 0,
    period_start    = v_now,
    updated_at      = v_now
  FROM tenant_subscriptions ts
  WHERE ts.tenant_id          = uc.tenant_id
    AND ts.status             IN ('active', 'trialing')
    AND ts.current_period_end IS NOT NULL
    AND ts.current_period_end  < v_now
    AND uc.period_start        < ts.current_period_end;

  RAISE NOTICE 'reset_usage_for_renewed_tenants completed at %', v_now;
END;
$$ LANGUAGE plpgsql;

-- ── 5. Schedule monthly reset via pg_cron (if extension is enabled) ──────────
-- To enable: run `CREATE EXTENSION IF NOT EXISTS pg_cron;` as superuser.
-- Uncomment the lines below once pg_cron is available:
--
-- SELECT cron.schedule(
--   'reset-usage-monthly',
--   '0 0 1 * *',  -- midnight on the 1st of each month
--   $$SELECT reset_usage_for_renewed_tenants();$$
-- );

-- ── 6. Backfill period_start for existing usage_counters rows ─────────────────
UPDATE usage_counters
SET period_start = COALESCE(period_start, created_at, now())
WHERE period_start IS NULL;

COMMIT;
