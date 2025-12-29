create extension if not exists "pgcrypto";

create table if not exists public.ecommerce_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  platform text not null, -- e.g. 'bigcommerce'
  status text not null default 'active',
  config jsonb not null default '{}'::jsonb, -- non-sensitive config (store_hash etc.)
  secrets_enc text not null,                -- encrypted token blob (base64/utf-8)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ecommerce_connections_tenant_platform
  on public.ecommerce_connections (tenant_id, platform);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ecommerce_connections_updated_at on public.ecommerce_connections;
create trigger trg_ecommerce_connections_updated_at
before update on public.ecommerce_connections
for each row execute function public.set_updated_at();
