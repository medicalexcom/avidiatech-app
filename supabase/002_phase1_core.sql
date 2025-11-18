-- Core Phase 1 schema for tenants, subscriptions, usage, and history

create extension if not exists "uuid-ossp";

create table if not exists tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique,
  stripe_customer_id text,
  created_at timestamptz default now()
);

create table if not exists tenant_memberships (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('owner','admin','member')),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists tenant_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  plan_name text not null default 'starter',
  status text not null default 'active',
  current_period_end timestamptz,
  stripe_subscription_id text,
  stripe_customer_id text,
  ingestion_quota integer,
  description_quota integer,
  created_at timestamptz default now()
);

alter table if exists usage_counters add column if not exists description_count integer not null default 0;

create table if not exists product_history (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  product_id uuid not null,
  version integer not null default 1,
  summary text,
  changed_by text,
  created_at timestamptz default now()
);

create table if not exists description_requests (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  prompt text not null,
  tone text,
  language text,
  created_at timestamptz default now()
);
