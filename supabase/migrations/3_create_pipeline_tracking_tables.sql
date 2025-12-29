-- Migration: Create pipeline tracking tables
-- This migration creates tables for tracking pipeline runs and module runs
-- 
-- Tables created:
-- - pipeline_runs: Main pipeline execution tracking
-- - module_runs: Individual module execution within pipelines
--
-- Prerequisites:
-- This migration assumes auth.uid() is available for authenticated users

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Pipeline Runs Table
-- Tracks pipeline execution lifecycle
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_by UUID NOT NULL, -- References auth.users
  metadata JSONB
);

-- Create indexes for pipeline_runs
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_created_by_created_at ON pipeline_runs(created_by, created_at DESC);

-- Module Runs Table
-- Tracks individual module execution within a pipeline run
CREATE TABLE IF NOT EXISTS module_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id UUID NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  module_index INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error JSONB,
  output_ref TEXT,
  input_ref TEXT
);

-- Create indexes for module_runs
CREATE INDEX IF NOT EXISTS idx_module_runs_pipeline_run_id_module_index ON module_runs(pipeline_run_id, module_index);
CREATE INDEX IF NOT EXISTS idx_module_runs_status ON module_runs(status);

-- Comments for documentation
COMMENT ON TABLE pipeline_runs IS 'Tracks pipeline execution lifecycle and metadata';
COMMENT ON TABLE module_runs IS 'Tracks individual module execution within pipeline runs';
COMMENT ON COLUMN pipeline_runs.created_by IS 'References auth.users - the user who initiated the pipeline';
COMMENT ON COLUMN module_runs.pipeline_run_id IS 'Foreign key to pipeline_runs with cascade delete';
