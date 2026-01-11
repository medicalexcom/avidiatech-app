-- AvidiaMonitor tables + (optional) RLS policies
-- Safe/idempotent where possible.
-- Run with service role / privileged migration runner.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------
-- Tables
-- ---------------------------------------------

CREATE TABLE IF NOT EXISTS public.monitor_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,

  url text NOT NULL,
  url_norm text NOT NULL,
  url_hash text NOT NULL,

  domain text,
  external_sku text NULL,

  source_modules text[] NOT NULL DEFAULT '{}'::text[],
  watch_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  policy jsonb NOT NULL DEFAULT '{}'::jsonb,

  frequency_minutes int NOT NULL DEFAULT 10080, -- weekly
  next_run_at timestamptz NOT NULL DEFAULT now(),
  last_checked_at timestamptz NULL,
  last_changed_at timestamptz NULL,

  status text NOT NULL DEFAULT 'active', -- active|paused|error
  error_count int NOT NULL DEFAULT 0,
  last_error text NULL,

  -- Optional pointer so Monitor can later trigger pipelines against a known ingestion
  last_ingestion_id uuid NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, url_hash)
);

CREATE INDEX IF NOT EXISTS idx_monitor_watchlist_tenant_next_run
  ON public.monitor_watchlist (tenant_id, next_run_at);

CREATE INDEX IF NOT EXISTS idx_monitor_watchlist_tenant_status
  ON public.monitor_watchlist (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_monitor_watchlist_tenant_domain
  ON public.monitor_watchlist (tenant_id, domain);


CREATE TABLE IF NOT EXISTS public.monitor_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  watch_id uuid NOT NULL REFERENCES public.monitor_watchlist(id) ON DELETE CASCADE,

  captured_at timestamptz NOT NULL DEFAULT now(),

  http_status int NULL,
  etag text NULL,
  last_modified text NULL,
  fetch_ms int NULL,

  snapshot jsonb NOT NULL,
  hashes jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_monitor_snapshots_tenant_watch_captured
  ON public.monitor_snapshots (tenant_id, watch_id, captured_at DESC);


CREATE TABLE IF NOT EXISTS public.monitor_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  watch_id uuid NOT NULL REFERENCES public.monitor_watchlist(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL, -- price_change|spec_change|manuals_change|images_change|seo_change|variants_change|fetch_error
  severity text NOT NULL,   -- info|warning|critical
  summary text NOT NULL,
  diff jsonb NOT NULL,

  triggered_actions jsonb NOT NULL DEFAULT '{}'::jsonb,
  pipeline_run_id uuid NULL
);

CREATE INDEX IF NOT EXISTS idx_monitor_events_tenant_created
  ON public.monitor_events (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_monitor_events_tenant_watch_created
  ON public.monitor_events (tenant_id, watch_id, created_at DESC);


-- ---------------------------------------------
-- updated_at trigger (reuse if exists)
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_monitor_watchlist_updated_at ON public.monitor_watchlist;
CREATE TRIGGER trg_monitor_watchlist_updated_at
BEFORE UPDATE ON public.monitor_watchlist
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------
-- Optional RLS (future-proofing)
-- NOTE: Your app mostly uses service role, so this is not relied upon today.
-- We use a "tenant_id from JWT" pattern only if present.
-- ---------------------------------------------
ALTER TABLE public.monitor_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitor_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitor_events ENABLE ROW LEVEL SECURITY;

-- Helper: attempt tenant_id from JWT claims
CREATE OR REPLACE FUNCTION public.jwt_tenant_id()
RETURNS uuid AS $$
DECLARE
  tid text;
BEGIN
  tid := (current_setting('request.jwt.claims', true)::json->>'tenant_id');
  IF tid IS NULL OR tid = '' THEN
    RETURN NULL;
  END IF;
  RETURN tid::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies: allow select/insert/update only when tenant matches jwt claim.
-- If jwt tenant is null, policies will deny.
DROP POLICY IF EXISTS monitor_watchlist_tenant_select ON public.monitor_watchlist;
CREATE POLICY monitor_watchlist_tenant_select ON public.monitor_watchlist
FOR SELECT USING (tenant_id = public.jwt_tenant_id());

DROP POLICY IF EXISTS monitor_watchlist_tenant_insert ON public.monitor_watchlist;
CREATE POLICY monitor_watchlist_tenant_insert ON public.monitor_watchlist
FOR INSERT WITH CHECK (tenant_id = public.jwt_tenant_id());

DROP POLICY IF EXISTS monitor_watchlist_tenant_update ON public.monitor_watchlist;
CREATE POLICY monitor_watchlist_tenant_update ON public.monitor_watchlist
FOR UPDATE USING (tenant_id = public.jwt_tenant_id()) WITH CHECK (tenant_id = public.jwt_tenant_id());

DROP POLICY IF EXISTS monitor_snapshots_tenant_select ON public.monitor_snapshots;
CREATE POLICY monitor_snapshots_tenant_select ON public.monitor_snapshots
FOR SELECT USING (tenant_id = public.jwt_tenant_id());

DROP POLICY IF EXISTS monitor_snapshots_tenant_insert ON public.monitor_snapshots;
CREATE POLICY monitor_snapshots_tenant_insert ON public.monitor_snapshots
FOR INSERT WITH CHECK (tenant_id = public.jwt_tenant_id());

DROP POLICY IF EXISTS monitor_events_tenant_select ON public.monitor_events;
CREATE POLICY monitor_events_tenant_select ON public.monitor_events
FOR SELECT USING (tenant_id = public.jwt_tenant_id());

DROP POLICY IF EXISTS monitor_events_tenant_insert ON public.monitor_events;
CREATE POLICY monitor_events_tenant_insert ON public.monitor_events
FOR INSERT WITH CHECK (tenant_id = public.jwt_tenant_id());

COMMIT;
