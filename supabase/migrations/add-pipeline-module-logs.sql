-- db/migrations/2025-12-15-add-pipeline-module-logs.sql
BEGIN;

CREATE TABLE IF NOT EXISTS pipeline_module_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id uuid NOT NULL,
  module_index integer NOT NULL,
  level text DEFAULT 'info',
  message text,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_module_logs_run_module ON pipeline_module_logs (pipeline_run_id, module_index);

COMMIT;
