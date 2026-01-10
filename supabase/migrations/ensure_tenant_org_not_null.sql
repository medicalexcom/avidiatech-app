-- name: db/migrations/2026-01-10_ensure_tenant_org_not_null.sql
-- Purpose: Add tenant_id/org_id columns, backfill using heuristics, record remaining failures,
-- and provide a safe path to mark columns NOT NULL after verification.
-- RUN IN STEPS: review previews, run backfills, inspect audit table, then (if zero remaining) run final NOT NULL alter.

-- 0) Safety: run these preview queries first (do not modify anything yet)
-- Preview rows missing tenant/org (small sample)
SELECT id, tenant_id, org_id, normalized_payload->>'sku' AS sku_hint, normalized_payload
FROM product_ingestions
WHERE tenant_id IS NULL OR tenant_id = ''
LIMIT 200;

-- 1) Ensure columns exist (idempotent)
ALTER TABLE IF EXISTS product_ingestions ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE IF EXISTS product_ingestions ADD COLUMN IF NOT EXISTS org_id uuid;

-- 2) Create an audit table to capture rows that couldn't be inferred automatically
CREATE TABLE IF NOT EXISTS ingestion_tenant_backfill_audit (
  ingestion_id uuid PRIMARY KEY,
  reason text NOT NULL,
  details jsonb NULL,
  created_at timestamptz DEFAULT now()
);

-- 3) Backfill #1: pipeline_runs.metadata.payload.tenantId (explicit)
-- Only applies when pipeline metadata contains a valid UUID
WITH pr AS (
  SELECT
    (pr.metadata->'payload'->>'ingestionId')::uuid AS ingestion_uuid,
    pr.metadata->'payload'->>'tenantId' AS tenant_text
  FROM pipeline_runs pr
  WHERE pr.metadata->'payload'->>'ingestionId' IS NOT NULL
    AND pr.metadata->'payload'->>'tenantId' ~ '^[0-9a-fA-F0-9\\-]{36}$'
)
UPDATE product_ingestions p
SET tenant_id = pr.tenant_text::uuid,
    org_id = pr.tenant_text::uuid
FROM pr
WHERE p.id = pr.ingestion_uuid
  AND (p.tenant_id IS NULL OR p.tenant_id = '');

-- 4) Backfill #2: import_jobs -> ecommerce_connections (connector_id -> connection.tenant_id)
-- If import_jobs.meta.connector_id references an ecommerce_connections row, use that tenant
UPDATE product_ingestions p
SET tenant_id = ec.tenant_id,
    org_id = ec.tenant_id
FROM import_jobs ij
JOIN ecommerce_connections ec
  ON (ij.meta->>'connector_id') ~ '^[0-9a-fA-F0-9\\-]{36}$'
 AND ec.id = (ij.meta->>'connector_id')::uuid
WHERE (p.tenant_id IS NULL OR p.tenant_id = '')
  AND (ij.meta->>'ingestionId') = p.id::text;

-- 5) Backfill #3: match ecommerce_connections by store_hash in normalized_payload -> ec.config.store_hash
UPDATE product_ingestions p
SET tenant_id = ec.tenant_id,
    org_id = ec.tenant_id
FROM ecommerce_connections ec
WHERE (p.tenant_id IS NULL OR p.tenant_id = '')
  AND (ec.config->>'store_hash') IS NOT NULL
  AND (ec.config->>'store_hash') = (p.normalized_payload->>'store_hash');

-- 6) Backfill #4: SKU-uniqueness heuristic
-- For any SKU where exactly one distinct non-null tenant exists in product_ingestions, apply that tenant.
WITH sku_tenants AS (
  SELECT
    (p2.normalized_payload->>'sku') AS sku,
    array_agg(DISTINCT p2.tenant_id) FILTER (WHERE p2.tenant_id IS NOT NULL) AS tenants
  FROM product_ingestions p2
  WHERE (p2.normalized_payload->>'sku') IS NOT NULL
  GROUP BY (p2.normalized_payload->>'sku')
),
to_update AS (
  SELECT p.id AS ingestion_id,
         (st.tenants)[1]::uuid AS tenant_uuid
  FROM product_ingestions p
  JOIN sku_tenants st ON st.sku = p.normalized_payload->>'sku'
  WHERE (p.tenant_id IS NULL OR p.tenant_id = '')
    AND array_length(st.tenants, 1) = 1
)
UPDATE product_ingestions p
SET tenant_id = tu.tenant_uuid,
    org_id = tu.tenant_uuid
FROM to_update tu
WHERE p.id = tu.ingestion_id;

-- 7) Capture remaining rows that still have NULL tenant_id for manual review
INSERT INTO ingestion_tenant_backfill_audit (ingestion_id, reason, details)
SELECT p.id, 'no_candidate', jsonb_build_object('normalized_payload', p.normalized_payload)
FROM product_ingestions p
WHERE p.tenant_id IS NULL
ON CONFLICT (ingestion_id) DO NOTHING;

-- 8) Preview counts: how many remain unfilled?
SELECT count(*) AS remaining_missing_tenant FROM product_ingestions WHERE tenant_id IS NULL;

-- 9) IMPORTANT: Manual step BEFORE making columns NOT NULL
-- Inspect ingestion_tenant_backfill_audit table for rows that couldn't be inferred:
-- SELECT * FROM ingestion_tenant_backfill_audit ORDER BY created_at DESC LIMIT 200;
-- For each row, either:
--  - decide the correct tenant_id and run the single-row update (example below), OR
--  - remove the ingestion if it's invalid, OR
--  - add more heuristics.

-- Example single-row manual fix (replace <TENANT_UUID> with chosen UUID):
-- UPDATE product_ingestions SET tenant_id = '<TENANT_UUID>'::uuid, org_id = '<TENANT_UUID>'::uuid WHERE id = '<INGESTION_ID>';

-- 10) When ingestion_tenant_backfill_audit has zero rows (i.e. no remaining null tenant),
-- you may make the columns NOT NULL for stronger DB enforcement:
-- (RUN THIS ONLY AFTER VERIFYING there are no missing tenants)
-- ALTER TABLE product_ingestions ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE product_ingestions ALTER COLUMN org_id SET NOT NULL;

-- 11) Optional: create a DB trigger to prevent future inserts without tenant_id
-- (enable this only after application code has been updated to always set tenant_id)
-- DROP FUNCTION IF EXISTS enforce_product_ingestion_tenant() CASCADE;
-- CREATE FUNCTION enforce_product_ingestion_tenant() RETURNS trigger AS $$
-- BEGIN
--   IF NEW.tenant_id IS NULL THEN
--     RAISE EXCEPTION 'product_ingestions.tenant_id cannot be null';
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER trg_enforce_product_ingestion_tenant
-- BEFORE INSERT OR UPDATE ON product_ingestions
-- FOR EACH ROW EXECUTE FUNCTION enforce_product_ingestion_tenant();

-- End of migration
