-- 2025-12-15T12:00:00Z  Create integrations table for connectors
-- Creates table public.integrations, index on org_id, and updated_at trigger.
-- Adjust types/constraints if your backend expects different column names.

-- ensure pgcrypto for gen_random_uuid() is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- create the table
CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NULL,
  provider text NOT NULL,
  name text NULL,
  config jsonb NULL,
  secrets jsonb NULL,
  status text NULL,
  last_synced_at timestamptz NULL,
  last_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- index for common lookups by org
CREATE INDEX IF NOT EXISTS idx_integrations_org_id ON public.integrations (org_id);

-- trigger function to update updated_at on row changes
CREATE OR REPLACE FUNCTION public._set_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- trigger binding
DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.integrations;
CREATE TRIGGER trigger_set_updated_at
BEFORE UPDATE ON public.integrations
FOR EACH ROW
EXECUTE FUNCTION public._set_updated_at_column();
