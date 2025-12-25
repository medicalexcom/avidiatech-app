-- supabase/migrations/2025-12-25_create_product_ingestions.sql
-- Create product_ingestions table expected by the ingest route.
-- Idempotent: checks IF NOT EXISTS where appropriate.

-- Ensure UUID generation extension exists (Supabase typically has pgcrypto enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.product_ingestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NULL,
  user_id text NULL,
  clerk_user_id text NULL,
  source_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  options jsonb DEFAULT '{}'::jsonb,
  flags jsonb DEFAULT '{}'::jsonb,
  export_type text DEFAULT 'JSON',
  correlation_id text,
  diagnostics jsonb DEFAULT '{}'::jsonb,
  normalized_payload jsonb,
  seo_payload jsonb,
  description_html text,
  features jsonb,
  seo_generated_at timestamptz,
  error jsonb,
  job_id uuid,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_product_ingestions_tenant_id ON public.product_ingestions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_ingestions_job_id ON public.product_ingestions (job_id);
CREATE INDEX IF NOT EXISTS idx_product_ingestions_correlation_id ON public.product_ingestions (correlation_id);
