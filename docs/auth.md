```markdown
Clerk & server-side auth (PR 1)
Required env vars (server):
- CLERK_API_KEY (server-side Clerk key)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- DEV_ORG_ID (optional, only for local dev; DO NOT set in production)

Local dev:
- To test locally without Clerk, set NODE_ENV=development and DEV_ORG_ID to a test org id.
- For production, ensure your Vercel or host has CLERK API keys and you do not rely on DEV_ORG_ID.

How to create the PR (commands)
- git checkout -b feat/auth/clerk-enforce
- (apply files above)
- git add .
- git commit -m "feat(auth): enforce Clerk server-side session & org enforcement (PR 1)"
- git push --set-upstream origin feat/auth/clerk-enforce
- Create PR via GitHub UI or use gh:
  gh pr create --base main --head feat/auth/clerk-enforce --title "feat(auth): enforce Clerk server-side session & org enforcement" --body "Implements Clerk-based session derivation and RBAC enforcement for API routes (PR 1)."
```
