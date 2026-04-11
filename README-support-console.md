 url=https://github.com/medicalexcom/avidiatech-app/blob/main/README-support-console.md
# Support console scaffolding (agent console)

Summary
- Adds staff console at `/internal/support`, admin APIs under `/api/support/admin/*`, and DB migrations to support user_ref and thread assignment/priority.

Migrations
1. Run `supabase db remote set <your-db>` or open Supabase SQL editor.
2. Apply:
   - supabase/migrations/3_add_user_ref_to_chat_participants.sql
   - supabase/migrations/4_add_assigned_and_priority.sql

Agent authorization
- Server admin endpoints call the DB helper `is_support_agent(user_id)` via `rpc`. Ensure that function exists and returns boolean using your profiles/roles mapping.
- If you want an allowlist for initial testing, change the admin endpoints to check an env var (not implemented here).

AI integration
- To enable AI draft, set `AI_API_KEY` in Vercel env (or server env). The endpoint calls OpenAI-style API; change provider/model as needed.

Testing
1. Merge branch and deploy.
2. Ensure migration ran.
3. As an agent user (is_support_agent returns true), visit /internal/support and verify:
   - Threads list loads
   - You can open a thread, read messages, send reply (creates chat_messages with sender_role='agent')
   - Right-hand context shows tenant/status
4. As a non-agent, admin endpoints should return 403.

If you’d like I can now:
- Create the PR with these files (I need repository push permissions), or
- Provide the patch as a single diff you can apply via CLI.

Add these to your README or run locally:

1) Install queue dependencies:
   npm install bullmq ioredis

2) Ensure Redis is running:
   - Local: docker run -p 6379:6379 -d redis
   - Set REDIS_URL env if not default (e.g. redis://localhost:6379)

3) For development auth shortcut:
   - Set DEV_ORG_ID in .env.local to your org uuid so the UI and routes derive org_id.

4) Start the worker (dev):
   npx ts-node --transpile-only src/worker/worker.ts
   (or compile to JS and run with node in production)

5) Test flow:
   - Create a connector in UI or call POST /api/v1/integrations with a valid session / DEV_ORG_ID.
   - Trigger sync: POST /api/v1/integrations/:id/sync — endpoint will create import_jobs row and enqueue connector-sync job. Worker will process and update import_jobs/import_rows.
   - Upload a CSV via ImportUploader => POST /api/imports — creates import_jobs row and enqueues import-process job.

Notes:
- Replace the placeholder worker logic with your real connector sync & import processing code.
- Implement Clerk (or another auth provider) in getOrgFromRequest to derive org securely and reject unauthorized calls.
