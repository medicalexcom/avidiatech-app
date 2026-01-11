-- db/migrations/2026-01-10_ensure_tenant_org_not_null.sql
-- Purpose: Add tenant_id/org_id to product_ingestions, backfill with multiple heuristics,
-- provide an auditable list of rows that couldn't be inferred automatically, and (optionally)
-- fill remaining rows with an admin-provided fallback tenant UUID and make the columns NOT NULL.
--
-- IMPORTANT:
-- 1) Run steps in order. Do NOT run the final NOT NULL ALTER until you have inspected the audit table.
-- 2) This script is defensive and avoids casting empty strings to uuid (avoids 22P02).
-- 3) If you want to forcibly set a fallback tenant for any remaining nulls, replace
--    <FALLBACK_TENANT_UUID> in step 9 with a valid UUID (including the single quotes).
--
-- Usage:
-- - Step 0: run the preview SELECT to inspect how many rows are missing tenant_id.
-- - Steps 1-6: run backfills (idempotent). These will fill many rows.
-- - Step 7: inspect ingestion_tenant_backfill_audit table for rows that still need manual review.
-- - Step 8 (optional): if acceptable, run the fallback update to set a default tenant for any remaining rows.
-- - Step 9 (optional, run only after Step 8 and verifying no remaining nulls): set tenant_id/org_id NOT NULL.

-- -----------------------------------------------------------------------------
-- 0) PREVIEW: sample of rows missing tenant (read-only)
-- -----------------------------------------------------------------------------
SELECT id, tenant_id::text AS tenant_id_text, org_id::text AS org_id_text, normalized_payload->>'sku' AS sku_hint, normalized_payload
FROM product_ingestions
WHERE (tenant_id IS NULL OR tenant_id::text = '')
LIMIT 200;

-- -----------------------------------------------------------------------------
-- 1) Ensure tenant_id and org_id columns exist (idempotent)
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS product_ingestions ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE IF EXISTS product_ingestions ADD COLUMN IF NOT EXISTS org_id uuid;

-- -----------------------------------------------------------------------------
-- 2) Create audit table for rows we couldn't infer automatically
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingestion_tenant_backfill_audit (
  ingestion_id uuid PRIMARY KEY,
  reason text NOT NULL,
  details jsonb NULL,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 3) Backfill: pipeline_runs.metadata.payload.tenantId (explicit)
-- -----------------------------------------------------------------------------
-- Only uses pipeline metadata values that look like UUIDs.
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
  AND (p.tenant_id IS NULL OR p.tenant_id::text = '');

-- -----------------------------------------------------------------------------
-- 4) Backfill: import_jobs.meta.connector_id -> ecommerce_connections.tenant_id
-- -----------------------------------------------------------------------------
-- Only applies when import_jobs.meta.connector_id contains a valid UUID and matches a connection.
WITH ij_conn AS (
  SELECT ij.meta->>'ingestionId' AS ingestion_text, (ij.meta->>'connector_id') AS connector_text
  FROM import_jobs ij
  WHERE ij.meta->>'ingestionId' IS NOT NULL
    AND (ij.meta->>'connector_id') ~ '^[0-9a-fA-F0-9\\-]{36}$'
)
UPDATE product_ingestions p
SET tenant_id = ec.tenant_id,
    org_id = ec.tenant_id
FROM ij_conn ic
JOIN ecommerce_connections ec ON ec.id = (ic.connector_text)::uuid
WHERE p.id::text = ic.ingestion_text
  AND (p.tenant_id IS NULL OR p.tenant_id::text = '');

-- -----------------------------------------------------------------------------
-- 5) Backfill: match by store_hash in normalized_payload -> ecommerce_connections.config.store_hash
-- Tries common key names for store hash.
-- -----------------------------------------------------------------------------
UPDATE product_ingestions p
SET tenant_id = ec.tenant_id,
    org_id = ec.tenant_id
FROM ecommerce_connections ec
WHERE (p.tenant_id IS NULL OR p.tenant_id::text = '')
  AND (
    (ec.config->>'store_hash') IS NOT NULL AND (ec.config->>'store_hash') = (p.normalized_payload->>'store_hash')
    OR
    (ec.config->>'storeHash') IS NOT NULL AND (ec.config->>'storeHash') = (p.normalized_payload->>'storeHash')
    OR
    (ec.config->>'store') IS NOT NULL AND (ec.config->>'store') = (p.normalized_payload->>'store')
  );

-- -----------------------------------------------------------------------------
-- 6) Backfill: SKU-uniqueness heuristic
-- Only set tenant when a SKU maps to exactly one distinct non-null tenant across ingestions.
-- -----------------------------------------------------------------------------
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
  WHERE (p.tenant_id IS NULL OR p.tenant_id::text = '')
    AND array_length(st.tenants, 1) = 1
)
UPDATE product_ingestions p
SET tenant_id = tu.tenant_uuid,
    org_id = tu.tenant_uuid
FROM to_update tu
WHERE p.id = tu.ingestion_id;

-- -----------------------------------------------------------------------------
-- 7) AUDIT: capture remaining rows still missing tenant_id for manual review
-- -----------------------------------------------------------------------------
INSERT INTO ingestion_tenant_backfill_audit (ingestion_id, reason, details)
SELECT p.id, 'no_candidate', jsonb_build_object(
  'normalized_payload', p.normalized_payload,
  'note', 'no pipeline metadata, no connector mapping, no store_hash match, SKU heuristic not unique'
)
FROM product_ingestions p
WHERE (p.tenant_id IS NULL OR p.tenant_id::text = '')
ON CONFLICT (ingestion_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8) PREVIEW: how many remain unfilled and sample
-- -----------------------------------------------------------------------------
-- remaining count
SELECT count(*) AS remaining_missing_tenant FROM product_ingestions WHERE (tenant_id IS NULL OR tenant_id::text = '');

-- sample remaining (first 200)
SELECT id, normalized_payload->>'sku' AS sku, normalized_payload
FROM product_ingestions
WHERE (tenant_id IS NULL OR tenant_id::text = '')
ORDER BY created_at DESC
LIMIT 200;

-- -----------------------------------------------------------------------------
-- 9) OPTIONAL FALLBACK (admin action)
-- If you are comfortable assigning a single fallback tenant for all remaining ingestions,
-- replace <FALLBACK_TENANT_UUID> with a real tenant UUID (including quotes) and run the block below.
-- This will set tenant_id/org_id on any remaining rows and allow you to make the columns NOT NULL.
-- Example: REPLACE '<FALLBACK_TENANT_UUID>' WITH 'cb5ae7e5-ef45-4530-8029-b37a2f88077d'
-- -----------------------------------------------------------------------------
-- UPDATE product_ingestions
-- SET tenant_id = '<FALLBACK_TENANT_UUID>'::uuid, org_id = '<FALLBACK_TENANT_UUID>'::uuid
-- WHERE (tenant_id IS NULL OR tenant_id::text = '')
-- RETURNING id;

-- -----------------------------------------------------------------------------
-- 10) FINAL: set NOT NULL (RUN ONLY AFTER YOU VERIFIED remaining_missing_tenant = 0)
-- -----------------------------------------------------------------------------
-- ALTER TABLE product_ingestions ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE product_ingestions ALTER COLUMN org_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 11) OPTIONAL: DB trigger to enforce tenant presence on future inserts/updates
-- Enable only after the application enforces tenant in ingestion creation.
-- -----------------------------------------------------------------------------
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
