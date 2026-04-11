-- Create integrations table and extend import_jobs for connector imports.
-- Run this in your Supabase SQL editor or via your migration tooling.

-- integrations: store connector configs (encrypted secrets)
create table if not exists integrations (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null,
  provider text not null, -- e.g. bigcommerce, shopify, woocommerce, magento, squarespace
  name text,
  config jsonb default '{}'::jsonb, -- non-secret metadata
  encrypted_secrets text, -- encrypted blob for API keys, tokens
  status text default 'ready',
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists integrations_org_id_idx on integrations(org_id);

-- Extend import_jobs to reference connector/connector sync
alter table if exists import_jobs
  add column if not exists source_type text default 'upload', -- upload | connector
  add column if not exists connector_id uuid,
  add column if not exists connector_sync_opts jsonb default '{}'::jsonb;

-- Foreign key not enforced here to avoid migration ordering issues; optional:
-- alter table import_jobs add constraint fk_connector foreign key (connector_id) references integrations(id) on delete set null;
