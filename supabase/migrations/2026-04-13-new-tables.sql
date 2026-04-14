-- ============================================================
-- 2026-04-13: New tables and columns for go-live readiness
-- Run this migration in your Supabase SQL editor or CLI.
-- All ALTER TABLE blocks are wrapped in DO $$ ... $$ guards
-- so the migration is safe to run even if the target table
-- does not exist yet.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. webhook_endpoints — stores registered outbound webhook URLs
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT        NOT NULL,
  url          TEXT        NOT NULL,
  secret       TEXT        NOT NULL,
  events       TEXT[]      NOT NULL DEFAULT '{}',
  enabled      BOOLEAN     NOT NULL DEFAULT TRUE,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS webhook_endpoints_tenant_url_idx
  ON webhook_endpoints (tenant_id, url);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_endpoints_tenant_isolation ON webhook_endpoints;
CREATE POLICY webhook_endpoints_tenant_isolation
  ON webhook_endpoints
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE));

-- ────────────────────────────────────────────────────────────
-- 2. webhook_deliveries — delivery log for each webhook attempt
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id     UUID        NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  tenant_id       TEXT        NOT NULL,
  event_type      TEXT        NOT NULL,
  payload         JSONB       NOT NULL DEFAULT '{}',
  response_status INTEGER,
  response_body   TEXT,
  attempt         INTEGER     NOT NULL DEFAULT 1,
  success         BOOLEAN     NOT NULL DEFAULT FALSE,
  error_message   TEXT,
  delivered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webhook_deliveries_endpoint_idx  ON webhook_deliveries (endpoint_id);
CREATE INDEX IF NOT EXISTS webhook_deliveries_tenant_idx    ON webhook_deliveries (tenant_id);
CREATE INDEX IF NOT EXISTS webhook_deliveries_delivered_idx ON webhook_deliveries (delivered_at DESC);

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_deliveries_tenant_isolation ON webhook_deliveries;
CREATE POLICY webhook_deliveries_tenant_isolation
  ON webhook_deliveries
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE));

-- ────────────────────────────────────────────────────────────
-- 3. team_members: add preferences / display_name / updated_at
--    (guarded: skipped if the table does not exist)
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'team_members'
  ) THEN
    ALTER TABLE team_members
      ADD COLUMN IF NOT EXISTS preferences  JSONB,
      ADD COLUMN IF NOT EXISTS display_name TEXT,
      ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();
  ELSE
    RAISE NOTICE 'table "team_members" not found — skipping column additions';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 4. products: add source_language and translated_languages
--    (guarded: skipped if the table does not exist)
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'products'
  ) THEN
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS source_language      TEXT  DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS translated_languages TEXT[] DEFAULT '{}';
  ELSE
    RAISE NOTICE 'table "products" not found — skipping column additions';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 5. api_keys: ensure revoked_at column exists
--    (guarded: skipped if the table does not exist)
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'api_keys'
  ) THEN
    ALTER TABLE api_keys
      ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
  ELSE
    RAISE NOTICE 'table "api_keys" not found — skipping column addition';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 6. Grant service role access to new tables
-- ────────────────────────────────────────────────────────────
GRANT ALL ON webhook_endpoints  TO service_role;
GRANT ALL ON webhook_deliveries TO service_role;

-- ────────────────────────────────────────────────────────────
-- 7. Updated-at trigger for webhook_endpoints
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS webhook_endpoints_updated_at ON webhook_endpoints;
CREATE TRIGGER webhook_endpoints_updated_at
  BEFORE UPDATE ON webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
