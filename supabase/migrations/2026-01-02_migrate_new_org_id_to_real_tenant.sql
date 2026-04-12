-- 2026-01-02_migrate_new_org_id_to_real_tenant.sql
-- Long-term fix: replace placeholder tenant id NEW_ORG_ID with a real tenant UUID.
-- This keeps tenant ids as TEXT in app tables, but uses tenants.id::text as the canonical value.
--
-- Assumptions (based on your schema/migrations):
-- - public.tenants exists: (id uuid, clerk_org_id text unique, ...)
-- - public.tenant_members exists: (tenant_id uuid, clerk_user_id text, role text, ...)
-- - public.team_members exists: (tenant_id text, user_id text, role text, ...)
-- - public.bulk_jobs exists: (org_id text, created_by text, ...)
-- - public.usage_counters exists: (tenant_id text, ...)
-- - public.tenant_subscriptions exists: (tenant_id text, ...)
--
-- Safe to run once. Re-running will be mostly idempotent, but review before reapplying.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Create a real tenant row representing the current placeholder "NEW_ORG_ID" tenant
-- We store the placeholder in clerk_org_id for traceability (you can later update to real Clerk org id).
DO $$
DECLARE
  new_tenant_uuid uuid;
BEGIN
  SELECT id INTO new_tenant_uuid
  FROM public.tenants
  WHERE clerk_org_id = 'NEW_ORG_ID'
  LIMIT 1;

  IF new_tenant_uuid IS NULL THEN
    INSERT INTO public.tenants (clerk_org_id, name)
    VALUES ('NEW_ORG_ID', 'Default Tenant (migrated from NEW_ORG_ID)')
    RETURNING id INTO new_tenant_uuid;
  END IF;
END $$;

-- 2) Compute the canonical text tenant id (uuid::text) for the NEW_ORG_ID tenant
-- We'll use this value everywhere in app tables.
DO $$
DECLARE
  canonical_tenant_text text;
BEGIN
  SELECT id::text INTO canonical_tenant_text
  FROM public.tenants
  WHERE clerk_org_id = 'NEW_ORG_ID'
  LIMIT 1;

  IF canonical_tenant_text IS NULL THEN
    RAISE EXCEPTION 'Expected a tenant row for clerk_org_id=NEW_ORG_ID but none found';
  END IF;

  -- 3) Migrate app tables from placeholder tenant id to canonical uuid string

  -- team_members
  UPDATE public.team_members
  SET tenant_id = canonical_tenant_text
  WHERE tenant_id = 'NEW_ORG_ID';

  -- bulk_jobs.org_id
  UPDATE public.bulk_jobs
  SET org_id = canonical_tenant_text
  WHERE org_id = 'NEW_ORG_ID';

  -- usage_counters.tenant_id
  UPDATE public.usage_counters
  SET tenant_id = canonical_tenant_text
  WHERE tenant_id = 'NEW_ORG_ID';

  -- tenant_subscriptions.tenant_id
  UPDATE public.tenant_subscriptions
  SET tenant_id = canonical_tenant_text
  WHERE tenant_id = 'NEW_ORG_ID';

END $$;

COMMIT;
