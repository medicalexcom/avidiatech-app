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
