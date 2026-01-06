-- Backfill suggestions for tenants.clerk_org_id
-- This script attempts several automated backfill strategies.
-- Review results carefully before committing. Run each UPDATE individually and verify.

-- 0) Safety: show current tenants that already have mappings
SELECT id, name, clerk_org_id FROM tenants WHERE clerk_org_id IS NOT NULL ORDER BY updated_at DESC LIMIT 200;

-- ---------------------------------------------------------------------------
-- Strategy A: backfill from integrations.config JSON if teams recorded clerk_org_id there.
-- Assumes integrations.org_id == tenants.id and integrations.config JSON may contain clerk_org_id.
-- Use only if integrations.config contains clerk_org_id in your data model.
-- ---------------------------------------------------------------------------
-- Preview rows that would be used:
SELECT i.id AS integration_id, i.org_id AS tenant_id, i.config->>'clerk_org_id' AS clerk_org_id, t.id AS tenant_id_check
FROM integrations i
JOIN tenants t ON t.id = i.org_id
WHERE (i.config->>'clerk_org_id') IS NOT NULL
LIMIT 200;

-- Apply update (uncomment to run)
-- UPDATE tenants t
-- SET clerk_org_id = i.config->>'clerk_org_id', updated_at = now()
-- FROM integrations i
-- WHERE i.org_id = t.id
--   AND (i.config->>'clerk_org_id') IS NOT NULL
--   AND (t.clerk_org_id IS NULL OR t.clerk_org_id = '');

-- ---------------------------------------------------------------------------
-- Strategy B: backfill from ecommerce_connections.config JSON if present
-- (use when connections were created with clerk_org_id in config)
-- ---------------------------------------------------------------------------
SELECT ec.id AS conn_id, ec.tenant_id, ec.config->>'clerk_org_id' AS clerk_org_id
FROM ecommerce_connections ec
WHERE (ec.config->>'clerk_org_id') IS NOT NULL
LIMIT 200;

-- Apply update (uncomment to run)
-- UPDATE tenants t
-- SET clerk_org_id = ec.config->>'clerk_org_id', updated_at = now()
-- FROM ecommerce_connections ec
-- WHERE ec.tenant_id = t.id
--   AND (ec.config->>'clerk_org_id') IS NOT NULL
--   AND (t.clerk_org_id IS NULL OR t.clerk_org_id = '');

-- ---------------------------------------------------------------------------
-- Strategy C: (safer) backfill from a maintainer-provided mapping table or CSV.
-- If you have a CSV mapping clerk_org_id -> tenant_id, load to a temp table and apply:
-- ---------------------------------------------------------------------------
-- Example (pseudo-steps):
-- 1) CREATE TABLE tmp_clerk_map(clerk_org_id text, tenant_id uuid);
-- 2) COPY tmp_clerk_map(clerk_org_id, tenant_id) FROM '/path/to/mapping.csv' WITH CSV HEADER;
-- 3) UPDATE tenants t SET clerk_org_id = m.clerk_org_id, updated_at = now()
--    FROM tmp_clerk_map m WHERE t.id = m.tenant_id AND (t.clerk_org_id IS NULL OR t.clerk_org_id = '');

-- ---------------------------------------------------------------------------
-- Strategy D: manual backfill for one-off cases (example)
-- ---------------------------------------------------------------------------
-- Replace values with the Clerk org id you observed and the corresponding tenant id.
-- UPDATE tenants SET clerk_org_id = 'org_36qka8iVinRXJ0kdcKUBI0jpLvc', updated_at = now() WHERE id = 'cb5ae7e5-ef45-4530-8029-b37a2f88077d';

-- ---------------------------------------------------------------------------
-- Verification queries
-- ---------------------------------------------------------------------------
-- Show tenants newly mapped:
SELECT id, name, clerk_org_id FROM tenants WHERE clerk_org_id IS NOT NULL ORDER BY updated_at DESC LIMIT 200;

-- Check for duplicate/clashes (should be none if index created):
SELECT clerk_org_id, COUNT(*) FROM tenants WHERE clerk_org_id IS NOT NULL GROUP BY clerk_org_id HAVING COUNT(*) > 1;

-- If you need to clear a backfill for a tenant:
-- UPDATE tenants SET clerk_org_id = NULL, updated_at = now() WHERE id = '<tenant_id>';

-- Rollback (if required)
-- DROP INDEX IF EXISTS idx_tenants_clerk_org_id_unique;
-- ALTER TABLE tenants DROP COLUMN IF EXISTS clerk_org_id;
