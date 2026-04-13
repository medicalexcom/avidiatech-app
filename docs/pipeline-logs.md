```markdown
Pipeline logs & retry (PR 4)

New endpoints:
- POST /api/v1/pipeline/run/:id/retry  (admin only) — enqueues a pipeline-retry job.
- GET /api/v1/pipeline/run/:id/module/:index/logs?page=1&pageSize=200 — returns paged module logs.

DB migration:
- Add pipeline_module_logs table (see db/migrations/2025-12-15-add-pipeline-module-logs.sql).

Worker changes:
- Worker writes pipeline_module_logs on key lifecycle events (started, progress, completed, errors).

Notes:
- Ensure SUPABASE_SERVICE_ROLE_KEY is available to the worker process and server to read/insert logs.
- The pipeline-retry worker (pipelineRetryProcessor) is a skeleton — implement specific re-run behavior for your pipeline design.
```
