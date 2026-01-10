-- db/migrations/2026-01-10_ensure_tenant_org_not_null.sql
-- Purpose: Add tenant_id/org_id if missing, backfill using heuristics, capture rows needing manual review,
-- and provide a safe path to mark columns NOT NULL after verification.
-- RUN IN STEPS: run the preview SELECTs, run backfills, inspect ingestion_tenant_backfill_audit, then (only when safe) run final NOT NULL ALTER.

-- NOTE: This script uses safe checks (tenant_id IS NULL OR tenant_id::text = '')
-- to avoid invalid uuid parsing when tenant_id contains empty strings.

-- -----------------------------------------------------------------------------
-- 0) PREVIEW: sample of rows missing tenant (do NOT modify anything yet)
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
-- 2) Create audit table for rows we cannot determine automatically
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingestion_tenant_backfill_audit (
  ingestion_id uuid PRIMARY KEY,
  reason text NOT NULL,
  details jsonb NULL,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 3) BACKFILL #1: pipeline_runs.metadata.payload.tenantId (explicit tenant in pipeline)
-- -----------------------------------------------------------------------------
-- Only applies when the metadata value is a valid UUID string.
WITH pr_candidates AS (
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
FROM pr_candidates pr
WHERE p.id = pr.ingestion_uuid
  AND (p.tenant_id IS NULL OR p.tenant_id::text = '');

-- -----------------------------------------------------------------------------
-- 4) BACKFILL #2: import_jobs.meta.connector_id -> ecommerce_connections.tenant_id
-- -----------------------------------------------------------------------------
-- Only applies when import_jobs.meta.connector_id is a valid UUID that maps to a connection.
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
-- 5) BACKFILL #3: match by store_hash in normalized_payload -> ecommerce_connections.config.store_hash
-- -----------------------------------------------------------------------------
UPDATE product_ingestions p
SET tenant_id = ec.tenant_id,
    org_id = ec.tenant_id
FROM ecommerce_connections ec
WHERE (p.tenant_id IS NULL OR p.tenant_id::text = '')
  AND (ec.config->>'store_hash') IS NOT NULL
  AND (ec.config->>'store_hash') = (p.normalized_payload->>'store_hash');

-- -----------------------------------------------------------------------------
-- 6) BACKFILL #4: SKU-uniqueness heuristic (apply only when exactly one tenant exists for the SKU)
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
-- 7) AUDIT: capture any remaining rows that still have NULL tenant_id for manual review
-- -----------------------------------------------------------------------------
INSERT INTO ingestion_tenant_backfill_audit (ingestion_id, reason, details)
SELECT p.id, 'no_candidate', jsonb_build_object('normalized_payload', p.normalized_payload)
FROM product_ingestions p
WHERE (p.tenant_id IS NULL OR p.tenant_id::text = '')
ON CONFLICT (ingestion_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8) Preview how many remain unfilled (manual check)
-- -----------------------------------------------------------------------------
SELECT count(*) AS remaining_missing_tenant FROM product_ingestions WHERE (tenant_id IS NULL OR tenant_id::text = '');

-- -----------------------------------------------------------------------------
-- 9) IMPORTANT: manual fix examples (do these only after inspection of audit table)
-- -----------------------------------------------------------------------------
-- Example single-row manual fix (replace <TENANT_UUID> and <INGESTION_ID> accordingly):
-- UPDATE product_ingestions SET tenant_id = '<TENANT_UUID>'::uuid, org_id = '<TENANT_UUID>'::uuid WHERE id = '<INGESTION_ID>';

-- -----------------------------------------------------------------------------
-- 10) FINAL STEP (RUN ONLY AFTER VERIFYING audit table is empty)
-- -----------------------------------------------------------------------------
-- Once you confirm SELECT count(*) FROM product_ingestions WHERE (tenant_id IS NULL OR tenant_id::text = '') = 0
-- and you have no rows left in ingestion_tenant_backfill_audit, you may make the columns NOT NULL:
-- ALTER TABLE product_ingestions ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE product_ingestions ALTER COLUMN org_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 11) OPTIONAL: DB trigger to enforce tenant presence on insert/update (enable only after app change)
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

-- End of migration file
