-- 2025-12-30-add-billing-tables.sql
-- Minimal billing tables required by src/lib/billing.ts
-- Run this against your production Postgres (the DB used by the app)

-- 1) team_members: used by resolveTenantMembership(userId)
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  user_id text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_members_user_idx ON public.team_members (user_id);
CREATE INDEX IF NOT EXISTS team_members_tenant_idx ON public.team_members (tenant_id);

-- 2) tenant_subscriptions: used by fetchSubscription(tenantId)
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  plan_name text,
  status text,
  current_period_end timestamptz,
  ingestion_quota integer,
  seo_quota integer,
  variant_quota integer,
  match_quota integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_subscriptions_tenant_idx ON public.tenant_subscriptions (tenant_id);

-- 3) usage_counters: used by getOrCreateUsageRow / incrementUsage
CREATE TABLE IF NOT EXISTS public.usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text UNIQUE NOT NULL,
  ingestion_count integer NOT NULL DEFAULT 0,
  seo_count integer NOT NULL DEFAULT 0,
  variants_count integer NOT NULL DEFAULT 0,
  match_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_counters_tenant_idx ON public.usage_counters (tenant_id);

-- Optional: ensure gen_random_uuid() exists (pgcrypto). If not present, user must enable extension.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
