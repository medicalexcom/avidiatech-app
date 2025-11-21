-- Base tables for tenants, users, and subscriptions

-- Create users table to store Clerk user references
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  clerk_user_id text not null unique,
  email text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create tenants table for multi-tenant support
create table if not exists tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create tenant_subscriptions table to track Stripe subscriptions
create table if not exists tenant_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  plan_name text,
  status text,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  current_period_end timestamp with time zone,
  ingestion_quota integer,
  seo_quota integer,
  variant_quota integer,
  match_quota integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row-Level Security
alter table users enable row level security;
alter table tenants enable row level security;
alter table tenant_subscriptions enable row level security;

-- Indexes for performance
create index if not exists idx_users_clerk_user_id on users(clerk_user_id);
create index if not exists idx_tenants_slug on tenants(slug);
create index if not exists idx_tenant_subscriptions_tenant_id on tenant_subscriptions(tenant_id);
create index if not exists idx_tenant_subscriptions_stripe_subscription_id on tenant_subscriptions(stripe_subscription_id);
