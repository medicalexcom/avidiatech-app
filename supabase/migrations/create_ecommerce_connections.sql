-- supabase/migrations/2025-12-25_create_ecommerce_connections.sql
-- Create ecommerce_connections table used by BigCommerce / other integrations.

CREATE TABLE IF NOT EXISTS public.ecommerce_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NULL,
  platform text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  config jsonb DEFAULT '{}'::jsonb,
  secrets_enc text NULL, -- encrypted payload / storage
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_connections_tenant_id ON public.ecommerce_connections (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_connections_platform ON public.ecommerce_connections (platform);
