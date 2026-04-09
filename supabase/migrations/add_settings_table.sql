-- Idempotent migration: create settings table for key/value store (global or tenant-scoped)
BEGIN;

CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  tenant_id uuid NULL, -- null = global / store-wide
  created_by text NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS settings_key_tenant_unique ON public.settings (key, tenant_id);

COMMIT;
