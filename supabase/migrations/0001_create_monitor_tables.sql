-- Create monitor_watches and monitor_events tables for AvidiaMonitor
-- Run this in Supabase SQL Editor or include in your migrations.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Watches table: definition of what to monitor
CREATE TABLE IF NOT EXISTS public.monitor_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text,
  product_id uuid,             -- optional FK to products table
  source_url text NOT NULL,
  watch_type text DEFAULT 'generic',
  frequency_seconds integer DEFAULT 86400, -- default 24h
  what_to_watch text DEFAULT 'all', -- comma separated or json later
  last_check_at timestamptz,
  last_status text,
  last_snapshot jsonb,         -- normalized snapshot of last fetch
  created_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitor_watches_source_url ON public.monitor_watches (source_url);
CREATE INDEX IF NOT EXISTS idx_monitor_watches_next_check ON public.monitor_watches (last_check_at);

-- Events table: diffs / found changes and metadata
CREATE TABLE IF NOT EXISTS public.monitor_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_id uuid REFERENCES public.monitor_watches(id) ON DELETE CASCADE,
  tenant_id text,
  product_id uuid,
  event_type text,         -- price_change, specs_change, docs_change, scrape_failed, etc.
  severity text DEFAULT 'info',
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitor_events_watch_id ON public.monitor_events (watch_id);
CREATE INDEX IF NOT EXISTS idx_monitor_events_product_id ON public.monitor_events (product_id);

-- (Optional) enable RLS and create safe policies for authenticated users (adjust for your rules)
ALTER TABLE public.monitor_watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitor_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated role to select/insert (example; adjust to your auth setup)
DROP POLICY IF EXISTS monitor_watches_select_auth ON public.monitor_watches;
CREATE POLICY monitor_watches_select_auth
  ON public.monitor_watches
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS monitor_watches_insert_auth ON public.monitor_watches;
CREATE POLICY monitor_watches_insert_auth
  ON public.monitor_watches
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS monitor_events_select_auth ON public.monitor_events;
CREATE POLICY monitor_events_select_auth
  ON public.monitor_events
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS monitor_events_insert_auth ON public.monitor_events;
CREATE POLICY monitor_events_insert_auth
  ON public.monitor_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Quick check:
SELECT 1;
