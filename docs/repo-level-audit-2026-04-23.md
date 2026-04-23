# AvidiaTech SaaS Repo-Level Technical Audit

Date: 2026-04-23  
Scope: `avidiatech-app`, `medx-render-api`, `medx-ingest-api`

## 1) Executive summary

The three repositories **do not currently operate as a cohesive SaaS platform**. The frontend repo is broad and feature-rich, but architecture and code hygiene are unstable. The ingest API is effectively a monolith with major coupling and security gaps. The render API is intentionally small, but operational hardening is incomplete. 

Highest-risk issues:
- Publicly reachable ingestion/render surfaces with weak or optional auth.
- Build artifacts and OS junk committed to source control.
- Inconsistent contracts, runtime versions, and type safety across repos.
- Very large, fragile files and route handlers with mixed concerns.

---

## 2) Strengths

- Frontend includes meaningful domain modules (ingest, monitor, billing, support, integrations), indicating product depth.
- Middleware/security headers are present and non-trivial in `avidiatech-app`.
- Ingest pipeline includes practical resilience patterns (render fallback, timeout/caching toggles).
- Render service has a minimal footprint and clean single-purpose behavior.

---

## 3) Major weaknesses

1. **Security posture is inconsistent and porous across services.**
2. **Codebase hygiene is poor (tracked generated files, debug endpoints, temporary diagnostics in production paths).**
3. **Architecture fragmentation: no shared contract package, no common validation layer, and inconsistent auth semantics.**
4. **High concentration of logic in a few giant files (front-end pages and ingestion server), increasing regression risk.**
5. **Insufficient test coverage relative to system complexity.**

---

## 4) Architecture findings

### Finding A1 — Repos are not governed by shared contracts
- **Category:** Shared architecture / contracts
- **Severity:** High
- **Evidence:** Frontend calls ingest with ad hoc payload/headers (`src/services/avidiaExtractToIngest.ts`), while ingest route expects query-driven GET behavior with no equivalent typed contract package. 
- **Why it matters:** Contract drift causes silent failures, inconsistent behavior between environments, and brittle integrations.
- **Recommended fix:** Introduce a shared `@medx/contracts` package (request/response schemas, error envelope, auth headers) and enforce at both caller + handler boundaries.
- **Paths:**
  - `avidiatech-app/src/services/avidiaExtractToIngest.ts`
  - `medx-ingest-api/server.js`

### Finding A2 — Runtime/toolchain inconsistency across repos
- **Category:** Platform consistency
- **Severity:** Medium
- **Evidence:** Node versions differ (`22.x` app, `20.x` ingest, `>=18` render).
- **Why it matters:** Behavior differences across fetch/AbortController/ESM/runtime APIs increase deployment drift.
- **Recommended fix:** Standardize on one LTS major across all repos and enforce via `.nvmrc` + CI checks.
- **Paths:**
  - `avidiatech-app/package.json`
  - `medx-ingest-api/package.json`
  - `medx-render-api/package.json`

### Finding A3 — Monolith ingestion server violates separation of concerns
- **Category:** Repository structure / SoC
- **Severity:** High
- **Evidence:** `medx-ingest-api/server.js` is ~5290 lines and mixes HTTP routing, HTML parsing, OCR, variant extraction, caching, SSRF logic, and queue bootstrap.
- **Why it matters:** Extremely high change-collision risk and low testability.
- **Recommended fix:** Split into modules (`routes/`, `extractors/`, `security/`, `integrations/`, `queue/`) and add unit tests around pure extraction functions.
- **Paths:**
  - `medx-ingest-api/server.js`

### Finding A4 — Duplicate route declarations imply brittle composition
- **Category:** API organization
- **Severity:** Medium
- **Evidence:** `medx-ingest-api/server.js` declares `/` and `/healthz` twice.
- **Why it matters:** Confusing ownership and route shadowing risk during refactors.
- **Recommended fix:** Single route registration location; enforce route map test.
- **Paths:**
  - `medx-ingest-api/server.js`

---

## 5) Front-end findings

### Finding F1 — App repository contains generated artifacts and junk files
- **Category:** Maintainability / repo hygiene
- **Severity:** High
- **Evidence:** `.next/*`, `dist/*`, and multiple `.DS_Store` files are tracked; `.gitignore` only ignores `node_modules` and one env file.
- **Why it matters:** Noisy diffs, merge churn, larger clone size, accidental artifact promotion to production.
- **Recommended fix:** Harden `.gitignore`, purge tracked artifacts (`git rm --cached`), add pre-commit guard.
- **Paths:**
  - `avidiatech-app/.gitignore`
  - `avidiatech-app/src/**/.DS_Store` (multiple)
  - `avidiatech-app/.next/*`
  - `avidiatech-app/dist/*`

### Finding F2 — Large page-client files indicate weak component boundaries
- **Category:** Front-end architecture
- **Severity:** High
- **Evidence:** Multiple client pages exceed practical maintainability size (e.g., SEO/audit/bulk/import dashboards).
- **Why it matters:** State bugs, difficult onboarding, hard-to-reason rerender behavior.
- **Recommended fix:** Break pages into feature slices with local hooks and UI primitives; enforce max file-size lint rule.
- **Paths:**
  - `avidiatech-app/src/app/dashboard/seo/page-client.tsx`
  - `avidiatech-app/src/app/dashboard/audit/page-client.tsx`
  - `avidiatech-app/src/app/dashboard/bulk/BulkJobClient.tsx`

### Finding F3 — Debug and temporary routes are still active in production path
- **Category:** Security / reliability
- **Severity:** High
- **Evidence:** Explicit temporary endpoints (`/api/debug/envs`, `/api/debug/supabase/profile`, `/api/_clerk_test`) with “remove after debugging” comments.
- **Why it matters:** Expands attack surface and leaks operational metadata.
- **Recommended fix:** Remove routes or guard by build-time flag + non-production deployment only.
- **Paths:**
  - `avidiatech-app/src/app/api/debug/envs/route.ts`
  - `avidiatech-app/src/app/api/debug/supabase/profile/route.ts`
  - `avidiatech-app/src/app/api/_clerk_test/route.ts`

---

## 6) Back-end / API findings

### Finding B1 — Ingest endpoint is callable without explicit API auth
- **Category:** Security / API protection
- **Severity:** Critical
- **Evidence:** `/ingest` validates URL/host but does not require API key/bearer auth before performing expensive rendering/extraction.
- **Why it matters:** Abuse vector (cost amplification, scraping abuse, denial pressure).
- **Recommended fix:** Require signed auth (HMAC or bearer), per-tenant rate limits, and explicit allowlists.
- **Paths:**
  - `medx-ingest-api/server.js`

### Finding B2 — Render API auth is optional and defaults to open
- **Category:** Security / API protection
- **Severity:** High
- **Evidence:** `AUTH_TOKEN = process.env.AUTH_TOKEN || null`; middleware bypasses auth when unset.
- **Why it matters:** If env misconfigured, raw rendering endpoint becomes publicly consumable.
- **Recommended fix:** Fail-fast startup when token missing outside local dev.
- **Paths:**
  - `medx-render-api/server.js`

### Finding B3 — API namespace consistency is poor in app repo
- **Category:** Route organization
- **Severity:** Medium
- **Evidence:** Mixed patterns (`/api/v1/*`, `/api/*`, `/api/developer/*`, `/api/debug/*`) and mixed auth helper usage (`getAuth` vs `safeGetAuth`).
- **Why it matters:** Non-uniform policy enforcement and confusing ownership.
- **Recommended fix:** Consolidate route conventions + auth middleware wrappers (one enforced pattern).
- **Paths:**
  - `avidiatech-app/src/app/api/**`

### Finding B4 — Validation is inconsistent and largely untyped at route boundaries
- **Category:** Type safety / validation
- **Severity:** High
- **Evidence:** Frequent `any` usage and permissive `req.json().catch(() => ({}))` patterns in API handlers.
- **Why it matters:** Silent malformed payload acceptance, runtime-only failures, weak error contracts.
- **Recommended fix:** Mandatory schema validation (zod/ajv) at every external boundary; disallow `any` in API modules.
- **Paths:**
  - `avidiatech-app/src/app/api/v1/integrations/route.ts`
  - `avidiatech-app/src/app/api/v1/ingest/route.ts`
  - `avidiatech-app/src/hooks/useDescribe.ts`

---

## 7) Performance findings

### Finding P1 — Render service launches full browser per request
- **Category:** Performance / scalability
- **Severity:** High
- **Evidence:** `chromium.launch()` inside each `/render` request.
- **Why it matters:** Cold start overhead and memory churn under concurrency.
- **Recommended fix:** Browser pool / context reuse, concurrency caps, request queueing.
- **Paths:**
  - `medx-render-api/server.js`

### Finding P2 — Ingest path contains heavy synchronous workflow in single request
- **Category:** Performance / reliability
- **Severity:** High
- **Evidence:** Rendering + extraction + optional OCR/manual processing in one handler path.
- **Why it matters:** Timeout sensitivity and cascading failure during upstream slowness.
- **Recommended fix:** Convert long-tail enrichments to async jobs; return job IDs and poll/webhook.
- **Paths:**
  - `medx-ingest-api/server.js`

### Finding P3 — Frontend pages likely over-render due to local state sprawl
- **Category:** Front-end performance
- **Severity:** Medium
- **Evidence:** Large client files with many local `useState` branches and imperative fetch patterns.
- **Why it matters:** Hard to optimize rerender granularity and cache behavior.
- **Recommended fix:** Standardize query caching layer (SWR/react-query) and split render trees.
- **Paths:**
  - `avidiatech-app/src/app/dashboard/*/page-client.tsx`

---

## 8) Maintainability findings

### Finding M1 — TypeScript strictness disabled in app
- **Category:** Maintainability / type safety
- **Severity:** High
- **Evidence:** `"strict": false`, `allowJs: true`, widespread `any` patterns.
- **Why it matters:** Refactor risk and reduced compiler signal.
- **Recommended fix:** Stage migration to `strict: true` (module-by-module), enable eslint rule for explicit `any` exceptions only.
- **Paths:**
  - `avidiatech-app/tsconfig.json`

### Finding M2 — Lint script does not run linting
- **Category:** Build quality gates
- **Severity:** Medium
- **Evidence:** `"lint": "npm run typecheck"`.
- **Why it matters:** Style/unsafe pattern checks are effectively absent.
- **Recommended fix:** Add ESLint (or Biome) and make CI block on lint + typecheck + test.
- **Paths:**
  - `avidiatech-app/package.json`

### Finding M3 — Ingest repo tracks `.env` and lacks `.gitignore`
- **Category:** Security / repo hygiene
- **Severity:** High
- **Evidence:** No `.gitignore`; `bc-agent/.env` is tracked.
- **Why it matters:** High probability of accidental secret commits and local-only files entering source.
- **Recommended fix:** Add `.gitignore`, untrack `.env`, enforce secret scanning in CI.
- **Paths:**
  - `medx-ingest-api` repo root
  - `medx-ingest-api/bc-agent/.env`

---

## 9) Security / reliability findings

### Finding S1 — Debug logging in auth-sensitive and integration code paths
- **Category:** Security / observability hygiene
- **Severity:** Medium
- **Evidence:** Production route comments and debug logs around cookies/auth outcomes.
- **Why it matters:** Log noise and potential metadata leakage.
- **Recommended fix:** Route-level structured logger with environment-based debug gating.
- **Paths:**
  - `avidiatech-app/src/app/api/v1/integrations/route.ts`
  - `avidiatech-app/src/app/api/v1/ingest/route.ts`

### Finding S2 — Internal auth conventions are fragmented
- **Category:** Reliability / auth consistency
- **Severity:** Medium
- **Evidence:** Internal keys use different header conventions (`x-service-api-key`, `x-pipeline-secret`, optional bearer in other service).
- **Why it matters:** Misconfiguration and bypass bugs across services.
- **Recommended fix:** One internal auth strategy (signed JWT or HMAC) + shared verifier utility.
- **Paths:**
  - `avidiatech-app/middleware.ts`
  - `avidiatech-app/src/app/api/v1/ingest/route.ts`
  - `medx-render-api/server.js`

---

## 10) Code that should be deleted or consolidated

- Remove debug endpoints:
  - `avidiatech-app/src/app/api/debug/**`
  - `avidiatech-app/src/app/api/_clerk_test/route.ts`
- Remove temporary comments/logging in stable routes:
  - `avidiatech-app/src/app/api/v1/integrations/route.ts`
- Remove tracked artifacts:
  - `avidiatech-app/.next/**`, `avidiatech-app/dist/**`, all `.DS_Store`
- Consolidate duplicated health/root routes in ingest:
  - `medx-ingest-api/server.js`
- Remove tracked env file and add ignore policy:
  - `medx-ingest-api/bc-agent/.env`

---

## 11) Missing systems or capabilities that should be added

1. Shared contract package for inter-repo API schemas and error envelopes.
2. Uniform auth middleware package for internal service-to-service calls.
3. CI quality gates: lint + strict type checks + tests + secret scanning.
4. Contract tests between app↔ingest and ingest↔render.
5. Centralized observability (structured logs, request IDs propagated across all repos).
6. Performance controls: render browser pooling and ingest async job model.
7. Dependency governance (lock Node version and package policy).

---

## 12) Top 10 actions by priority

1. **(Critical)** Enforce mandatory auth on `medx-ingest-api /ingest`.
2. **(High)** Enforce non-optional auth on `medx-render-api` in non-dev environments.
3. **(High)** Purge tracked artifacts/junk and harden `.gitignore` across all repos.
4. **(High)** Remove all debug endpoints from production app surface.
5. **(High)** Introduce shared contracts package + route validation at boundaries.
6. **(High)** Split `medx-ingest-api/server.js` into composable modules.
7. **(Medium)** Standardize Node runtime and CI toolchain across repos.
8. **(Medium)** Add real linting pipeline and begin strict TypeScript rollout.
9. **(Medium)** Add contract/integration tests for top product flows.
10. **(Medium)** Refactor largest front-end pages into smaller feature components/hooks.

---

## 13) Suggested remediation roadmap

### Phase 0 (1–3 days)
- Remove debug endpoints + logs in hot routes.
- Lock down ingest/render auth.
- Fix git hygiene (`.gitignore`, purge tracked build/junk files).

### Phase 1 (1–2 weeks)
- Define shared request/response contracts.
- Add schema validation to top 8 public/internal routes.
- Add CI gates (lint/typecheck/tests/secret scan).

### Phase 2 (2–4 weeks)
- Decompose ingest monolith into modules with unit tests.
- Introduce asynchronous job flow for expensive enrichment tasks.
- Add distributed request tracing across repos.

### Phase 3 (ongoing)
- Strict TypeScript migration.
- Front-end decomposition of largest dashboards.
- Performance tuning with load testing and SLO-based alerts.

---

## Immediate Fixes Worth Doing Now

High-confidence, quick changes with meaningful impact:
1. Disable/remove `src/app/api/debug/*` and `src/app/api/_clerk_test/route.ts` immediately.
2. Require `AUTH_TOKEN` in render API for non-local env and fail startup if missing.
3. Require API auth on ingest endpoint before processing target URLs.
4. Update `.gitignore` in all repos; remove `.next`, `dist`, `.DS_Store`, and `.env` from tracking.
5. Remove duplicate `/` and `/healthz` registrations in ingest server.
6. Replace temporary debug logging in `api/v1/integrations` with structured conditional logging.

---

## PR Breakdown: What We Are Fixing, How, and Why

Below is the recommended GitHub PR sequence. Each PR is intentionally scoped so it can be reviewed and rolled back safely.

### PR-1: Lock down exposed ingestion/render surfaces (Security Hotfix)
- **Repos:** `medx-ingest-api`, `medx-render-api`, `avidiatech-app`
- **What we fix**
  - Require auth for `/ingest` in `medx-ingest-api` (reject missing/invalid internal token).
  - Require `AUTH_TOKEN` for `medx-render-api` in non-local env; fail startup if absent.
  - Normalize internal headers strategy between app worker calls and APIs.
- **Why this first**
  - These are externally reachable cost-amplification and abuse vectors.
- **Advantage**
  - Immediate risk reduction (abuse, cost spikes, unauthorized scraping).
  - Fewer incident-response fire drills.

### PR-2: Remove debug attack surface + temporary diagnostics
- **Repos:** `avidiatech-app`
- **What we fix**
  - Delete `/api/debug/*` and `/api/_clerk_test`.
  - Remove temporary debug logs from stable routes (notably integrations/ingest internals).
- **Why**
  - Debug endpoints are not a product feature and leak operational metadata.
- **Advantage**
  - Smaller attack surface, cleaner logs, easier alert triage.

### PR-3: Repository hygiene and secret safety baseline
- **Repos:** all three
- **What we fix**
  - Add proper `.gitignore` files.
  - Untrack generated artifacts (`.next`, `dist`), OS junk (`.DS_Store`), env files (`.env`).
  - Add secret scanning workflow and basic pre-commit checks.
- **Why**
  - Current repos permit accidental leakage and noisy commits.
- **Advantage**
  - Faster reviews, lower leak probability, cleaner release diffs.

### PR-4: API contract standardization (Shared schemas + error envelope)
- **Repos:** all three (new shared package or shared folder strategy)
- **What we fix**
  - Define typed request/response schemas for app↔ingest and ingest↔render paths.
  - Standardize error payload structure and status mapping.
  - Validate inputs at route boundary (zod/ajv) before business logic.
- **Why**
  - Current contract drift is already visible across repos.
- **Advantage**
  - Fewer integration regressions and much faster debugging.

### PR-5: Auth/tenant policy unification in app routes
- **Repos:** `avidiatech-app`
- **What we fix**
  - Consolidate `getAuth`/`safeGetAuth` usage behind one route guard utility.
  - Unify internal call auth policy and tenant resolution fallback behavior.
- **Why**
  - Mixed auth patterns create inconsistent enforcement.
- **Advantage**
  - Predictable access control and fewer tenant-isolation edge-case bugs.

### PR-6: Ingest server modularization (start with route split)
- **Repos:** `medx-ingest-api`
- **What we fix**
  - Break `server.js` into `routes`, `extractors`, `security`, `queue`, `services`.
  - Remove duplicate `/` and `/healthz` declarations.
  - Keep behavior equivalent in first pass (refactor-only safety PR).
- **Why**
  - Current 5k+ line monolith is too risky to evolve safely.
- **Advantage**
  - Better testability, lower blast radius per change, faster onboarding.

### PR-7: Performance hardening (render pool + async long-tail ingestion)
- **Repos:** `medx-render-api`, `medx-ingest-api`, `avidiatech-app`
- **What we fix**
  - Replace per-request browser launch with pooled browser/context strategy in render API.
  - Move expensive enrichments (OCR/manual enrichment) to async jobs in ingest.
  - Return job IDs and progress endpoints/webhooks.
- **Why**
  - Current sync-heavy path is timeout-prone under load.
- **Advantage**
  - Better throughput, lower p95 latency, improved uptime during spikes.

### PR-8: Front-end decomposition of largest dashboard clients
- **Repos:** `avidiatech-app`
- **What we fix**
  - Split oversized `page-client.tsx` files into feature modules + hooks.
  - Introduce consistent data fetching/cache pattern for dashboard pages.
- **Why**
  - Existing large components are fragile and expensive to modify.
- **Advantage**
  - Faster feature delivery, fewer UI regressions, better performance profiling.

### PR-9: Type-safety ratchet + real linting gate
- **Repos:** `avidiatech-app` (then APIs)
- **What we fix**
  - Replace pseudo-lint script with real lint pipeline.
  - Add strictness ratchet (no new `any`, then incrementally enable stricter TS options).
- **Why**
  - Current static checks do not prevent many classes of defects.
- **Advantage**
  - Prevents debt growth while enabling safer refactors.

### PR-10: Cross-repo integration/contract test suite
- **Repos:** all three
- **What we fix**
  - Add smoke + contract tests for core flow: app request → ingest → render → callback/result.
  - Add CI-required checks for those tests.
- **Why**
  - System spans multiple repos but lacks system-level safety net.
- **Advantage**
  - Catch breaking changes before deploy; confidence for parallel development.

---

## Quick Mapping: Issue → PR

- Exposed APIs / weak auth → **PR-1**
- Debug endpoints / temporary diagnostics → **PR-2**
- Build artifacts, env tracking, repo noise → **PR-3**
- Inconsistent payloads and validation gaps → **PR-4**
- Mixed auth helpers and tenant logic drift → **PR-5**
- 5k-line ingest monolith and duplicate routes → **PR-6**
- Latency/throughput bottlenecks in render/ingest → **PR-7**
- Large fragile dashboard files → **PR-8**
- Weak static quality gates → **PR-9**
- Lack of end-to-end contract confidence → **PR-10**
