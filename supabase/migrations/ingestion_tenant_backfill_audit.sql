-- 2026-01-11_ingestion_tenant_backfill_audit.sql
-- Purpose:
-- 1) Create an auditable table for product_ingestions rows missing tenant_id
-- 2) Provide a minimal, safe backfill using profiles (if available)
-- 3) Record unresolved rows for manual review
--
-- This is idempotent and safe to re-run.

begin;

create extension if not exists "pgcrypto";

create table if not exists public.ingestion_tenant_backfill_audit (
  id uuid primary key default gen_random_uuid(),
  ingestion_id uuid not null,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz null,
  resolution_source text null, -- e.g. 'profiles.clerk_user_id', 'profiles.user_id', 'manual'
  resolved_tenant_id uuid null,
  notes text null,
  snapshot jsonb not null default '{}'::jsonb,
  unique (ingestion_id)
);

-- 1) Snapshot all missing-tenant ingestions into audit table (idempotent)
insert into public.ingestion_tenant_backfill_audit (ingestion_id, snapshot)
select
  pi.id as ingestion_id,
  jsonb_build_object(
    'tenant_id', pi.tenant_id,
    'user_id', pi.user_id,
    'clerk_user_id', pi.clerk_user_id,
    'source_url', pi.source_url,
    'status', pi.status,
    'created_at', pi.created_at,
    'updated_at', pi.updated_at,
    'job_id', pi.job_id,
    'correlation_id', pi.correlation_id
  ) as snapshot
from public.product_ingestions pi
where pi.tenant_id is null
on conflict (ingestion_id) do nothing;

-- 2) Minimal automated backfill from profiles table (best effort).
-- This assumes profiles.tenant_id is a UUID and user_id/clerk_user_id match product_ingestions.user_id.
do $$
begin
  -- Backfill via profiles.clerk_user_id
  update public.product_ingestions pi
  set tenant_id = p.tenant_id,
      updated_at = now()
  from public.profiles p
  where pi.tenant_id is null
    and p.tenant_id is not null
    and pi.user_id is not null
    and p.clerk_user_id = pi.user_id;

  -- Backfill via profiles.user_id (legacy)
  update public.product_ingestions pi
  set tenant_id = p.tenant_id,
      updated_at = now()
  from public.profiles p
  where pi.tenant_id is null
    and p.tenant_id is not null
    and pi.user_id is not null
    and p.user_id = pi.user_id;

exception
  when undefined_table then
    -- profiles table may not exist in some deployments; skip
    raise notice 'profiles table not found; skipping automated backfill step';
  when undefined_column then
    -- clerk_user_id or user_id columns may not exist; skip
    raise notice 'profiles missing expected columns; skipping automated backfill step';
end $$;

-- 3) Update audit rows for any ingestion that is now resolved
update public.ingestion_tenant_backfill_audit a
set
  resolved_at = now(),
  resolution_source = coalesce(a.resolution_source, 'profiles_backfill'),
  resolved_tenant_id = pi.tenant_id
from public.product_ingestions pi
where a.ingestion_id = pi.id
  and a.resolved_at is null
  and pi.tenant_id is not null;

commit;
