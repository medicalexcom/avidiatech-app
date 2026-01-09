-- db/migrations/2025-12-15-add-integration-schedules.sql
BEGIN;

CREATE TABLE IF NOT EXISTS integration_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  integration_id uuid NOT NULL,
  cron_expression text NOT NULL,
  timezone text DEFAULT 'UTC',
  next_run_at timestamptz,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedules_org ON integration_schedules(org_id);

COMMIT;
