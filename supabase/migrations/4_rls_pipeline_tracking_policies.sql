-- Migration: Row Level Security (RLS) policies for pipeline tracking tables
-- This migration enables RLS and creates security policies for pipeline runs
--
-- Security Model:
-- 1. Users can only SELECT their own pipeline_runs (created_by = auth.uid())
-- 2. Users can only INSERT pipeline_runs with created_by = auth.uid()
-- 3. Users can only UPDATE their own pipeline_runs
-- 4. Users can access module_runs if they own the associated pipeline_run
--
-- Prerequisites:
-- This migration assumes auth.uid() is available for authenticated users

-- ====================
-- ENABLE RLS ON PIPELINE TRACKING TABLES
-- ====================

ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_runs ENABLE ROW LEVEL SECURITY;

-- ====================
-- PIPELINE_RUNS POLICIES
-- ====================

-- Policy: Users can view only their own pipeline runs
CREATE POLICY "Users can view own pipeline runs"
ON pipeline_runs
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  created_by = auth.uid()
);

-- Policy: Users can insert pipeline runs with their own user ID
CREATE POLICY "Users can create pipeline runs"
ON pipeline_runs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  created_by = auth.uid()
);

-- Policy: Users can update only their own pipeline runs
CREATE POLICY "Users can update own pipeline runs"
ON pipeline_runs
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  created_by = auth.uid()
);

-- ====================
-- MODULE_RUNS POLICIES
-- ====================

-- Policy: Users can view module runs for their own pipeline runs
CREATE POLICY "Users can view own module runs"
ON module_runs
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM pipeline_runs
    WHERE pipeline_runs.id = module_runs.pipeline_run_id
    AND pipeline_runs.created_by = auth.uid()
  )
);

-- Policy: Users can insert module runs for their own pipeline runs
CREATE POLICY "Users can create module runs"
ON module_runs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM pipeline_runs
    WHERE pipeline_runs.id = module_runs.pipeline_run_id
    AND pipeline_runs.created_by = auth.uid()
  )
);

-- Policy: Users can update module runs for their own pipeline runs
CREATE POLICY "Users can update own module runs"
ON module_runs
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM pipeline_runs
    WHERE pipeline_runs.id = module_runs.pipeline_run_id
    AND pipeline_runs.created_by = auth.uid()
  )
);

-- Comments for documentation
COMMENT ON POLICY "Users can view own pipeline runs" ON pipeline_runs IS 'Users can only view pipeline runs they created';
COMMENT ON POLICY "Users can create pipeline runs" ON pipeline_runs IS 'Users can only create pipeline runs with their own user ID';
COMMENT ON POLICY "Users can update own pipeline runs" ON pipeline_runs IS 'Users can only update their own pipeline runs';
COMMENT ON POLICY "Users can view own module runs" ON module_runs IS 'Users can view module runs for pipelines they own';
COMMENT ON POLICY "Users can create module runs" ON module_runs IS 'Users can create module runs for pipelines they own';
COMMENT ON POLICY "Users can update own module runs" ON module_runs IS 'Users can update module runs for pipelines they own';
