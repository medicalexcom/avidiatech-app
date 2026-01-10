-- db/scripts/2026-01-10_backfill_heuristics.sql
-- 1) Backfill from pipeline_runs metadata (tenantId)
WITH pr AS (
  SELECT
    (pr.metadata->'payload'->>'ingestionId')::uuid AS ingestion_uuid,
    pr.metadata->'payload'->>'tenantId' AS tenant_text
  FROM pipeline_runs pr
  WHERE pr.metadata->'payload'->>'ingestionId' IS NOT NULL
    AND pr.metadata->'payload'->>'tenantId' ~ '^[0-9a-fA-F0-9\\-]{36}$'
)
UPDATE product_ingestions p
SET tenant_id = pr.tenant_text::uuid, org_id = pr.tenant_text::uuid, updated_at = now()
FROM pr
WHERE p.id = pr.ingestion_uuid
  AND (p.tenant_id IS NULL OR p.tenant_id::text = '')
RETURNING p.id;

-- 2) Backfill from import_jobs.connector_id -> ecommerce_connections.tenant_id
WITH ij_conn AS (
  SELECT ij.meta->>'ingestionId' AS ingestion_text, (ij.meta->>'connector_id') AS connector_text
  FROM import_jobs ij
  WHERE ij.meta->>'ingestionId' IS NOT NULL
    AND (ij.meta->>'connector_id') ~ '^[0-9a-fA-F0-9\\-]{36}$'
)
UPDATE product_ingestions p
SET tenant_id = ec.tenant_id, org_id = ec.tenant_id, updated_at = now()
FROM ij_conn ic
JOIN ecommerce_connections ec ON ec.id = (ic.connector_text)::uuid
WHERE p.id::text = ic.ingestion_text
  AND (p.tenant_id IS NULL OR p.tenant_id::text = '')
RETURNING p.id;

-- 3) Backfill by store_hash match
UPDATE product_ingestions p
SET tenant_id = ec.tenant_id, org_id = ec.tenant_id, updated_at = now()
FROM ecommerce_connections ec
WHERE (p.tenant_id IS NULL OR p.tenant_id::text = '')
  AND (
    (ec.config->>'store_hash') IS NOT NULL AND (ec.config->>'store_hash') = (p.normalized_payload->>'store_hash')
    OR
    (ec.config->>'storeHash') IS NOT NULL AND (ec.config->>'storeHash') = (p.normalized_payload->>'storeHash')
    OR
    (ec.config->>'store') IS NOT NULL AND (ec.config->>'store') = (p.normalized_payload->>'store')
  )
RETURNING p.id;

-- 4) SKU-uniqueness heuristic (only when SKU maps to exactly 1 tenant)
WITH sku_tenants AS (
  SELECT (p2.normalized_payload->>'sku') AS sku,
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
    AND array_length(st.tenants,1) = 1
)
UPDATE product_ingestions p
SET tenant_id = tu.tenant_uuid, org_id = tu.tenant_uuid, updated_at = now()
FROM to_update tu
WHERE p.id = tu.ingestion_id
RETURNING p.id;

-- 5) AUDIT: insert remaining missing rows into audit table (do not overwrite existing audit entries)
INSERT INTO ingestion_tenant_backfill_audit (ingestion_id, reason, details)
SELECT p.id, 'no_candidate', jsonb_build_object(
  'normalized_payload', p.normalized_payload,
  'note', 'no pipeline metadata, no connector mapping, no store_hash match, SKU heuristic not unique'
)
FROM product_ingestions p
WHERE (p.tenant_id IS NULL OR p.tenant_id::text = '')
ON CONFLICT (ingestion_id) DO NOTHING;

-- 6) Report remaining count
SELECT count(*) AS remaining_missing_tenant FROM product_ingestions WHERE (tenant_id IS NULL OR tenant_id::text = '');
