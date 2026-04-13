-- Backfill a single tenant with known mapping (run in Supabase SQL editor)
-- Replace the clerk_org_id and tenant_id values if different.

BEGIN;

-- Verify existing mapping (preview)
SELECT id, name, clerk_org_id FROM tenants WHERE id = 'cb5ae7e5-ef45-4530-8029-b37a2f88077d';

-- Apply one-off mapping
UPDATE tenants
SET clerk_org_id = 'org_36qka8iVinRXJ0kdcKUBI0jpLvc',
    updated_at = now()
WHERE id = 'cb5ae7e5-ef45-4530-8029-b37a2f88077d'
  AND (clerk_org_id IS NULL OR clerk_org_id = '');

-- Verify result
SELECT id, name, clerk_org_id FROM tenants WHERE id = 'cb5ae7e5-ef45-4530-8029-b37a2f88077d';

COMMIT;
