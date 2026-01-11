-- 2026-01-11-add-org-id-to-product-ingestions.sql
--
-- Migration: introduce an `org_id` column on product_ingestions.
--
-- In order to ensure that every ingestion row is associated with the same
-- tenant/organization key used elsewhere in the application, this migration:
--   1) Adds a nullable `org_id` column if it does not already exist.
--   2) Backfills existing rows by copying the value from `tenant_id`.
--   3) Sets a NOT NULL constraint on `org_id` to prevent future omissions.
--
-- This file is idempotent; running it multiple times will not cause errors.

begin;

-- Ensure pgcrypto is available for UUID generation (optional but common).
create extension if not exists "pgcrypto";

-- 1) Add the org_id column if it doesn't exist.  Use TEXT to align with other
--    tables (bulk_jobs.org_id is TEXT).  Adjust to UUID if your schema uses
--    UUID values instead.
alter table public.product_ingestions
  add column if not exists org_id text;

-- 2) Backfill existing rows where org_id is null.  Use tenant_id as the
--    canonical value since older code stored the tenant in that column.
update public.product_ingestions
  set org_id = tenant_id
  where org_id is null;

-- 3) Enforce NOT NULL on org_id so inserts must specify it.
alter table public.product_ingestions
  alter column org_id set not null;

-- Create an index to speed up lookups by org_id, mirroring the tenant_id index.
create index if not exists idx_product_ingestions_org_id on public.product_ingestions (org_id);

commit;
