-- Add product_source_index and match job tables for Match: SKU -> URL
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- product_source_index: memory of known mappings (Phase 1)
CREATE TABLE IF NOT EXISTS public.product_source_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  supplier_name text,
  supplier_key text NOT NULL,
  sku text,
  sku_norm text,
  ndc_item_code text,
  ndc_item_code_norm text,
  product_name text,
  brand_name text,
  source_url text NOT NULL,
  source_domain text NOT NULL,
  canonical_product_id uuid,
  source_ingestion_id uuid,
  confidence numeric NOT NULL DEFAULT 1.0,
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_source_index_tenant_supplier_ndc ON public.product_source_index (tenant_id, supplier_key, ndc_item_code_norm) WHERE ndc_item_code_norm IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_source_index_tenant_supplier_sku ON public.product_source_index (tenant_id, supplier_key, sku_norm) WHERE sku_norm IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_source_index_tenant_supplier ON public.product_source_index (tenant_id, supplier_key);
CREATE INDEX IF NOT EXISTS idx_product_source_index_tenant_sku_norm ON public.product_source_index (tenant_id, sku_norm);
CREATE INDEX IF NOT EXISTS idx_product_source_index_tenant_ndc_norm ON public.product_source_index (tenant_id, ndc_item_code_norm);
CREATE INDEX IF NOT EXISTS idx_product_source_index_domain ON public.product_source_index (source_domain);

-- match_url_jobs: job header
CREATE TABLE IF NOT EXISTS public.match_url_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  created_by text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  source_type text NOT NULL DEFAULT 'distributor_sheet',
  file_name text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_count int DEFAULT 0,
  resolved_count int DEFAULT 0,
  review_count int DEFAULT 0,
  unresolved_count int DEFAULT 0,
  error_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_jobs_tenant ON public.match_url_jobs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_match_jobs_status ON public.match_url_jobs (status);

-- match_url_job_rows: per-input row & result
CREATE TABLE IF NOT EXISTS public.match_url_job_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.match_url_jobs(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  row_id text NOT NULL,
  supplier_name text,
  sku text,
  ndc_item_code text,
  product_name text,
  brand_name text,
  raw jsonb,
  supplier_key text,
  sku_norm text,
  ndc_item_code_norm text,
  product_name_norm text,
  status text NOT NULL DEFAULT 'queued',
  resolved_url text,
  resolved_domain text,
  confidence numeric NOT NULL DEFAULT 0,
  matched_by text,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_rows_job ON public.match_url_job_rows (job_id);
CREATE INDEX IF NOT EXISTS idx_job_rows_tenant_supplier_sku ON public.match_url_job_rows (tenant_id, supplier_key, sku_norm);
CREATE INDEX IF NOT EXISTS idx_job_rows_tenant_supplier_ndc ON public.match_url_job_rows (tenant_id, supplier_key, ndc_item_code_norm);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_rows_job_rowid ON public.match_url_job_rows (job_id, row_id);

-- Note: enable RLS & policies per your tenancy/auth model.
