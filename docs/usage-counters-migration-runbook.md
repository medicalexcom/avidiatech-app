# Usage Counters Migration Runbook

This project now treats **`supabase/migrations/2026-04-22_usage_counters_canonicalization.sql`** as the canonical migration for `usage_counters`.

## Canonical target schema
- one row per `tenant_id`
- columns:
  - `ingestion_count`
  - `seo_count`
  - `variants_count`
  - `match_count`
  - `period_start`
  - `updated_at`

## Apply order (manual)
1. Apply all historical migrations already deployed in your environment.
2. Apply:
   - `supabase/migrations/2026-04-22_usage_counters_canonicalization.sql`
3. Verify:
   - `usage_counters_tenant_unique` index exists.
   - trigger `trg_usage_counters_set_updated_at` exists.
   - canonical counter columns exist.

## Superseded / legacy migrations
These remain in-repo for history, but canonicalization migration above is the source of truth:
- `supabase/migrations/001_create_team_usage_api_keys.sql`
- `supabase/migrations/2025-12-30-add-billing-tables.sql`
- `supabase/migrations/add_usage_counters_and_period_start.sql`
- `supabase/migrations/2026-04-12-billing-fixes.sql`

## Runtime guardrail
`src/lib/supabaseServer.ts` now performs a one-time runtime schema check and logs a warning if canonical columns are missing.
