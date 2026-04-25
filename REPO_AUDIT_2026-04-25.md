# AvidiaTech Cross-Repo Remediation PR Plan (2026-04-25)

This replaces the prior placeholder marker with an executable PR/deployment plan
for the 3 repositories:
- `avidiatech-app`
- `medx-render-api`
- `medx-ingest-api`

## How many PRs are needed?

**Minimum: 6 PRs** (safe, deployable sequence).

1. **PR-1 (app): CI/typecheck stabilization**
   - Fix TypeScript route typing drift and make `npm run typecheck` deterministic in CI.
   - Add/confirm CI gate for typecheck + tests.

2. **PR-2 (render): auth hardening + CORS allowlist**
   - Require `AUTH_TOKEN` in production boot.
   - Restrict CORS to configured origins.

3. **PR-3 (ingest): queue route auth/feature-flag guard**
   - Disable `/scrape-queue` and `/ingest-and-return` unless explicitly enabled.
   - Add service auth middleware.

4. **PR-4 (app): API contract reliability fixes**
   - Update `/api/upload-to-supabase` to return non-2xx on DB insert failures.
   - Remove synthetic-success responses for hard DB failures.

5. **PR-5 (app): quota enforcement hardening**
   - Replace `Infinity` quota in describe route with plan-tier limits.
   - Fail closed on quota-check subsystem errors for paid endpoints.

6. **PR-6 (cross-repo): shared prompt/schema package wiring**
   - Introduce versioned shared package for prompt/schema assets.
   - Update app + ingest to consume pinned versions.

## Why this split?

- Keeps each PR small and deployable.
- Isolates risk domains (CI, security, API contracts, shared assets).
- Allows rollback by capability area instead of one large change set.

## Deployment order

1. PR-1 (app) — establish green CI baseline.
2. PR-2 (render) — lock renderer perimeter.
3. PR-3 (ingest) — lock ingest auxiliary routes.
4. PR-4 (app) — repair client-visible reliability contracts.
5. PR-5 (app) — enforce cost controls.
6. PR-6 (cross-repo) — consolidate shared assets after stability.

## Deploy gates required for every PR

- Branch protection enabled (required checks + review).
- Required checks pass:
  - lint/typecheck
  - unit tests
  - build
- Environment-specific smoke test after deploy.
- Rollback note included in PR description.

## PR template (required sections)

- Scope / non-goals
- Risk assessment
- Migration/deploy notes
- Rollback plan
- Test evidence (commands + outputs)

## Done criteria

- No PR merges with failing required checks.
- No placeholder documentation-only PRs for runtime issues.
- Security-sensitive PRs (render/ingest auth) deployed before contract expansion work.
