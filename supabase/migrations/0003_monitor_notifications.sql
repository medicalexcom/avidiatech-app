-- Add notifications, rules, and event processing fields for Monitor
-- Run in Supabase SQL Editor or include in your migrations.

ALTER TABLE public.monitor_watches
  ADD COLUMN IF NOT EXISTS auto_watch boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS price_threshold_percent numeric DEFAULT NULL, -- e.g. 5 => alert on >=5% change
  ADD COLUMN IF NOT EXISTS muted_until timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sensitivity jsonb DEFAULT '{}'::jsonb; -- future flexible settings

ALTER TABLE public.monitor_events
  ADD COLUMN IF NOT EXISTS processed boolean DEFAULT false;

-- Notification table (app-visible notifications)
CREATE TABLE IF NOT EXISTS public.monitor_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text,
  watch_id uuid REFERENCES public.monitor_watches(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.monitor_events(id) ON DELETE SET NULL,
  user_id text,              -- optional (if you want per-user notifications)
  title text,
  body text,
  payload jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Rules table to map event -> actions
CREATE TABLE IF NOT EXISTS public.monitor_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text,
  name text,
  enabled boolean DEFAULT true,
  event_type text,          -- e.g. "change_detected", "price_change"
  condition jsonb,          -- example: {"price_pct_change": 5}
  action jsonb,             -- e.g. {"type":"webhook","url":"https://..."} or {"type":"email","to":"ops@..."}
  created_by text,
  created_at timestamptz DEFAULT now()
);

-- Simple webhooks table (optional; rules.action could be webhook directly)
CREATE TABLE IF NOT EXISTS public.monitor_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text,
  name text,
  url text NOT NULL,
  secret text,              -- HMAC secret to sign payload if desired
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitor_events_unprocessed ON public.monitor_events (processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_monitor_rules_event_type ON public.monitor_rules (event_type);
