create extension if not exists "pgcrypto";

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null unique,
  name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  clerk_user_id text not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (tenant_id, clerk_user_id)
);

create index if not exists idx_tenant_members_clerk_user_id
  on public.tenant_members (clerk_user_id);

-- updated_at trigger (reuse if already exists)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tenants_updated_at on public.tenants;
create trigger trg_tenants_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();
