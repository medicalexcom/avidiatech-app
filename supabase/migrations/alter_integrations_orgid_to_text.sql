-- alter integrations.org_id to text to accept non-UUID org identifiers
BEGIN;

-- drop index that references org_id if present (so we can change type cleanly)
DROP INDEX IF EXISTS idx_integrations_org_id;

-- If org_id has a default of gen_random_uuid(), drop it first
ALTER TABLE public.integrations ALTER COLUMN org_id DROP DEFAULT;

-- Change type to text using a safe cast (UUIDs cast to text fine, strings left intact)
ALTER TABLE public.integrations
  ALTER COLUMN org_id TYPE text USING org_id::text;

-- recreate index on org_id as text
CREATE INDEX IF NOT EXISTS idx_integrations_org_id ON public.integrations (org_id);

COMMIT;
