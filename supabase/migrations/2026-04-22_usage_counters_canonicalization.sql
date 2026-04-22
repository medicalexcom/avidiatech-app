-- Canonicalize usage_counters schema to one-row-per-tenant counters.
-- Safe to run multiple times.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  period_start timestamptz NOT NULL DEFAULT date_trunc('month', now()),
  ingestion_count integer NOT NULL DEFAULT 0,
  seo_count integer NOT NULL DEFAULT 0,
  variants_count integer NOT NULL DEFAULT 0,
  match_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS period_start timestamptz;
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS ingestion_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS seo_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS variants_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS match_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.usage_counters ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.usage_counters
SET period_start = COALESCE(period_start, created_at, now())
WHERE period_start IS NULL;

-- Backfill feature counters from legacy metric/count rows if those columns exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='usage_counters' AND column_name='metric'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='usage_counters' AND column_name='count'
  ) THEN
    UPDATE public.usage_counters u
    SET ingestion_count = GREATEST(
      COALESCE(u.ingestion_count, 0),
      COALESCE((
        SELECT SUM(COALESCE(u2.count, 0))
        FROM public.usage_counters u2
        WHERE u2.tenant_id = u.tenant_id
          AND u2.metric IN ('describe_calls', 'ingestion')
      ), 0)
    ),
    seo_count = GREATEST(
      COALESCE(u.seo_count, 0),
      COALESCE((
        SELECT SUM(COALESCE(u2.count, 0))
        FROM public.usage_counters u2
        WHERE u2.tenant_id = u.tenant_id
          AND u2.metric = 'seo'
      ), 0)
    ),
    variants_count = GREATEST(
      COALESCE(u.variants_count, 0),
      COALESCE((
        SELECT SUM(COALESCE(u2.count, 0))
        FROM public.usage_counters u2
        WHERE u2.tenant_id = u.tenant_id
          AND u2.metric = 'variants'
      ), 0)
    ),
    match_count = GREATEST(
      COALESCE(u.match_count, 0),
      COALESCE((
        SELECT SUM(COALESCE(u2.count, 0))
        FROM public.usage_counters u2
        WHERE u2.tenant_id = u.tenant_id
          AND u2.metric = 'match'
      ), 0)
    );
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS usage_counters_tenant_unique
  ON public.usage_counters (tenant_id);

CREATE OR REPLACE FUNCTION public._usage_counters_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usage_counters_set_updated_at ON public.usage_counters;
CREATE TRIGGER trg_usage_counters_set_updated_at
BEFORE UPDATE ON public.usage_counters
FOR EACH ROW
EXECUTE FUNCTION public._usage_counters_set_updated_at();

COMMIT;
