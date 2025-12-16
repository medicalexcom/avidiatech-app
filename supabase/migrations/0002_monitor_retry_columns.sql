-- Add retry metadata and next_check scheduling for Monitor watches
ALTER TABLE public.monitor_watches
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS next_check_at timestamptz;

-- Optional index to find due watches quickly
CREATE INDEX IF NOT EXISTS idx_monitor_watches_next_check_at ON public.monitor_watches (next_check_at);
