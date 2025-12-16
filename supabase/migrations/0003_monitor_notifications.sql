-- Migration: add monitor rules, notifications, webhooks and supporting columns
-- Idempotent and safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add watch columns
ALTER TABLE IF EXISTS public.monitor_watches
  ADD COLUMN IF NOT EXISTS auto_watch boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS price_threshold_percent numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS muted_until timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sensitivity jsonb DEFAULT '{}'::jsonb;

-- Add event processed flag
ALTER TABLE IF EXISTS public.monitor_events
  ADD COLUMN IF NOT EXISTS processed boolean DEFAULT false;

-- Notifications table
CREATE TABLE IF NOT EXISTS public.monitor_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text,
  watch_id uuid REFERENCES public.monitor_watches(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.monitor_events(id) ON DELETE SET NULL,
  user_id text,
  title text,
  body text,
  payload jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Rules table
CREATE TABLE IF NOT EXISTS public.monitor_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text,
  name text,
  enabled boolean DEFAULT true,
  event_type text,
  condition jsonb,
  action jsonb,
  created_by text,
  created_at timestamptz DEFAULT now()
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS public.monitor_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text,
  name text,
  url text NOT NULL,
  secret text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitor_events_unprocessed ON public.monitor_events (processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_monitor_rules_event_type ON public.monitor_rules (event_type);
