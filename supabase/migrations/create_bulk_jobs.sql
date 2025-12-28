-- Create bulk_jobs and bulk_job_items tables for AvidiaSEO bulk processing
-- Run this migration against your Postgres DB used by the app (eg. Supabase).

CREATE TABLE IF NOT EXISTS bulk_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text,
  name text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'queued', -- queued | running | succeeded | failed | cancelled
  total_items int NOT NULL DEFAULT 0,
  completed_items int NOT NULL DEFAULT 0,
  failed_items int NOT NULL DEFAULT 0,
  options jsonb DEFAULT '{}'::jsonb,
  metrics jsonb DEFAULT '{}'::jsonb,
  meta jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS bulk_jobs_created_at_idx ON bulk_jobs (created_at);

CREATE TABLE IF NOT EXISTS bulk_job_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_job_id uuid NOT NULL REFERENCES bulk_jobs (id) ON DELETE CASCADE,
  item_index int NOT NULL,
  input_url text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  idempotency_key text,
  ingestion_id text,
  pipeline_run_id text,
  status text NOT NULL DEFAULT 'queued', -- queued | in_progress | succeeded | failed | cancelled | skipped
  tries int NOT NULL DEFAULT 0,
  last_error jsonb DEFAULT NULL,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bulk_job_items_job_idx ON bulk_job_items (bulk_job_id);
CREATE INDEX IF NOT EXISTS bulk_job_items_status_idx ON bulk_job_items (status);
CREATE INDEX IF NOT EXISTS bulk_job_items_idempotency_idx ON bulk_job_items (idempotency_key);
