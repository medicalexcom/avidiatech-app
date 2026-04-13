-- 2026-01-14_create_price_module.sql
-- Price module (MVP): pricing_profiles, price_calculations, price_history + extend product_ingestions
--
-- Notes:
-- - Uses tenant_id uuid to match product_ingestions + ecommerce_connections.
-- - All changes are additive (no breaking schema changes).
-- - RLS: not enabled here because the app mostly uses service-role access today.
--   You can add RLS later when Clerk <-> Supabase JWT is fully wired.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------
-- pricing_profiles
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.pricing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,

  -- 'markup' | 'margin'
  mode text NOT NULL DEFAULT 'markup' CHECK (mode IN ('markup', 'margin')),

  -- markup=0.25 => cost*1.25 ; margin=0.22 => cost/(1-0.22)
  value numeric NOT NULL DEFAULT 0,

  -- 'none' | 'nearest_0_05' | 'nearest_0_10' | 'ends_99'
  rounding text NOT NULL DEFAULT 'none'
    CHECK (rounding IN ('none', 'nearest_0_05', 'nearest_0_10', 'ends_99')),

  include_shipping_buffer boolean NOT NULL DEFAULT false,
  shipping_buffer numeric NOT NULL DEFAULT 0,

  min_price numeric NULL,
  max_price numeric NULL,

  -- If set, enforce margin floor. Interpreted as decimal: 0.20 => 20%
  min_margin numeric NULL,

  -- Reserved for later (MAP, competitor signals, rule DSL)
  map_policy jsonb NULL,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_profiles_tenant_enabled
  ON public.pricing_profiles (tenant_id, enabled);

CREATE INDEX IF NOT EXISTS idx_pricing_profiles_tenant_name
  ON public.pricing_profiles (tenant_id, name);

-- updated_at trigger (reuse existing set_updated_at() if present, otherwise create it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    JOIN pg_namespace n ON n.oid = pg_proc.pronamespace
    WHERE proname = 'set_updated_at' AND n.nspname = 'public'
  ) THEN
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_pricing_profiles_updated_at ON public.pricing_profiles;
CREATE TRIGGER trg_pricing_profiles_updated_at
BEFORE UPDATE ON public.pricing_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------
-- price_calculations
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.price_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  ingestion_id uuid NOT NULL REFERENCES public.product_ingestions(id) ON DELETE CASCADE,

  -- 'ui' | 'bulk' | 'api' | 'monitor' | 'pipeline'
  source text NOT NULL DEFAULT 'ui',

  -- 'monitor' | 'suggest' | 'auto'
  mode text NOT NULL DEFAULT 'suggest' CHECK (mode IN ('monitor', 'suggest', 'auto')),

  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  profile_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  explain text NULL,

  -- 'computed' | 'approved' | 'pushed' | 'failed' | 'blocked'
  status text NOT NULL DEFAULT 'computed'
    CHECK (status IN ('computed', 'approved', 'pushed', 'failed', 'blocked')),

  error jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_calculations_tenant_ingestion_created
  ON public.price_calculations (tenant_id, ingestion_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_calculations_tenant_status
  ON public.price_calculations (tenant_id, status);

-- -----------------------------
-- price_history (store-side changes)
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  store_connection_id uuid NULL REFERENCES public.ecommerce_connections(id) ON DELETE SET NULL,
  ingestion_id uuid NOT NULL REFERENCES public.product_ingestions(id) ON DELETE CASCADE,

  platform text NULL, -- e.g. 'bigcommerce'
  product_id text NULL, -- BC product id
  variant_id text NULL,

  old_price numeric NULL,
  new_price numeric NOT NULL,

  reason text NULL, -- e.g. 'formula', 'cost_update', 'approval'
  calc_id uuid NULL REFERENCES public.price_calculations(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_tenant_ingestion_created
  ON public.price_history (tenant_id, ingestion_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_history_tenant_store
  ON public.price_history (tenant_id, store_connection_id, created_at DESC);

-- -----------------------------
-- Extend product_ingestions
-- -----------------------------
ALTER TABLE public.product_ingestions
  ADD COLUMN IF NOT EXISTS cost_input numeric NULL,
  ADD COLUMN IF NOT EXISTS supplier_price_input numeric NULL,
  ADD COLUMN IF NOT EXISTS pricing_profile_id uuid NULL REFERENCES public.pricing_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pricing_result jsonb NULL,
  ADD COLUMN IF NOT EXISTS store_price numeric NULL,
  ADD COLUMN IF NOT EXISTS price_mode text NULL;

CREATE INDEX IF NOT EXISTS idx_product_ingestions_store_price
  ON public.product_ingestions (store_price);

COMMIT;
