-- Add columns expected by server route (idempotent)
ALTER TABLE public.product_ingestions
  ADD COLUMN IF NOT EXISTS correlation_id text,
  ADD COLUMN IF NOT EXISTS diagnostics jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS job_id uuid,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS export_type text,
  ADD COLUMN IF NOT EXISTS flags jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS options jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS user_id text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_product_ingestions_correlation_id ON public.product_ingestions (correlation_id);
