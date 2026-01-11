-- db/migrations/2025-12-15-add-mapping-presets.sql
-- Create mapping_presets table. Uses gen_random_uuid() (pgcrypto extension).
BEGIN;

CREATE TABLE IF NOT EXISTS mapping_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  provider text NOT NULL,
  name text NOT NULL,
  mapping jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mapping_presets_org_provider ON mapping_presets (org_id, provider);

COMMIT;
