-- Add updated_at to bulk_jobs if missing, and create trigger to maintain it
ALTER TABLE IF EXISTS public.bulk_jobs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Initialize values for existing rows where updated_at is null
UPDATE public.bulk_jobs
SET updated_at = created_at
WHERE updated_at IS NULL;

-- Create function to auto-update updated_at on row modification (if not present)
CREATE OR REPLACE FUNCTION public.set_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Attach trigger to bulk_jobs (only if not already attached)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'bulk_jobs' AND t.tgname = 'bulk_jobs_set_updated_at_tr'
  ) THEN
    CREATE TRIGGER bulk_jobs_set_updated_at_tr
    BEFORE UPDATE ON public.bulk_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_column();
  END IF;
END;
$$;
