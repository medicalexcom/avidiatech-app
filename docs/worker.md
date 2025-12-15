```markdown
Worker & Queue (BullMQ) — RUNBOOK

Purpose
- Run the worker process to process connector syncs and import jobs enqueued by API endpoints.

Required env variables (worker process)
- REDIS_URL (e.g., redis://127.0.0.1:6379 or rediss://:password@redis.example.com:6379)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- BATCH_SIZE (optional, default 400)
- WORKER_CONCURRENCY (optional, default 2)
- NODE_ENV=production ideally in prod

Local dev steps
1) Start Redis:
   docker run -p 6379:6379 --name local-redis -d redis

2) Set env vars (example .env.local):
   REDIS_URL=redis://127.0.0.1:6379
   SUPABASE_URL=https://your.supabase.url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NODE_ENV=development

3) Run worker (dev):
   npx ts-node --transpile-only src/worker/worker.ts

Production deploy suggestions
- Deploy the worker as a separate service (Render, Railway, Fly, Docker on VM).
- Build the project (tsc) and run node dist/worker/worker.js.
- Ensure REDIS_URL points to a managed Redis instance (Upstash, Redis Cloud, AWS Elasticache with TLS).
- Do not run the worker on Vercel (serverless).

Notes
- Worker writes to Supabase tables: import_jobs, import_rows, pipeline_runs, pipeline_module_logs.
- Ensure Supabase service role key is provided only to worker (not to public clients).
```
