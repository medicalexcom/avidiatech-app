-- supabase/migrations/2025-12-25_create_product_translations.sql
-- Create product_translations table used by translation endpoints.

CREATE TABLE IF NOT EXISTS public.product_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NULL,
  product_id uuid NOT NULL REFERENCES public.product_ingestions(id) ON DELETE CASCADE,
  language text NOT NULL,
  name text,
  description_html text,
  features jsonb DEFAULT '{}'::jsonb,
  specs jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Prevent duplicate translations for same product+lang
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_translations_product_language
  ON public.product_translations (product_id, language);
CREATE INDEX IF NOT EXISTS idx_product_translations_tenant_id ON public.product_translations (tenant_id);
