-- ============================================================
-- 2026-04-13: New tables and columns for go-live readiness
-- Run this migration in your Supabase SQL editor or CLI.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. webhook_endpoints — stores registered outbound webhook URLs
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT        NOT NULL,
  url          TEXT        NOT NULL,
  secret       TEXT        NOT NULL,                       -- HMAC signing secret, stored hashed
  events       TEXT[]      NOT NULL DEFAULT '{}',          -- e.g. ['product.extracted','product.described']
  enabled      BOOLEAN     NOT NULL DEFAULT TRUE,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One endpoint URL per tenant (upsert-friendly unique constraint)
CREATE UNIQUE INDEX IF NOT EXISTS webhook_endpoints_tenant_url_idx
  ON webhook_endpoints (tenant_id, url);

-- RLS: tenants can only see their own endpoints
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

-- RLS
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_deliveries_tenant_isolation ON webhook_deliveries;
CREATE POLICY webhook_deliveries_tenant_isolation
  ON webhook_deliveries
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE));

-- ────────────────────────────────────────────────────────────
-- 3. team_members: add preferences (JSONB) and display_name columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS preferences  JSONB,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

-- ────────────────────────────────────────────────────────────
-- 4. products: add source_language and translated_languages columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS source_language      TEXT       DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS translated_languages TEXT[]     DEFAULT '{}';

-- ────────────────────────────────────────────────────────────
-- 5. api_keys: ensure revoked_at column exists
--    (may already exist from previous migration)
-- ────────────────────────────────────────────────────────────
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- ────────────────────────────────────────────────────────────
-- 6. Grant service role access to new tables
-- ────────────────────────────────────────────────────────────
GRANT ALL ON webhook_endpoints  TO service_role;
GRANT ALL ON webhook_deliveries TO service_role;

-- ────────────────────────────────────────────────────────────
-- 7. Updated-at trigger helper for webhook_endpoints
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
