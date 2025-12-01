/**
 * loadInstructions.ts
 *
 * - Provides loadCustomGptInstructions(tenantId?)
 * - Resolution order (best-effort):
 *    1) Tenant-specific override from Supabase (table: tenant_settings/custom_gpt_instructions) — optional
 *    2) Canonical file from the medx-ingest-api repo via raw.githubusercontent.com
 *    3) Returns null if nothing available (callers should fall back to defaults)
 *
 * Config (via env):
 * - RENDER_PROMPTS_REPO = "medicalexcom/medx-ingest-api" (default)
 * - RENDER_PROMPTS_COMMIT = commit sha or branch name (defaults to the commitoid embedded below)
 * - RENDER_PROMPTS_TTL_SECONDS = 600 (default cache TTL)
 *
 * Notes:
 * - Using raw.githubusercontent.com is simplest for cross-repo reads at runtime.
 * - You can replace or augment the Supabase tenant lookup to read from object storage or another source.
 * - Keep caching short (minutes) so updates to the canonical prompts can be rolled out by changing commit or TTL.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_REPO = "medicalexcom/medx-ingest-api";
// CommitOid you provided as a stable fallback; change via env if you prefer branch (e.g., "main")
const FALLBACK_COMMIT = "34dd54c508824b84d2ad3cd21d782af219044718";
const DEFAULT_TTL = parseInt(process.env.RENDER_PROMPTS_TTL_SECONDS || "600", 10);

let cached: { value: string | null; fetchedAt: number } | null = null;

async function fetchFromGithubRaw(): Promise<string | null> {
  const repo = process.env.RENDER_PROMPTS_REPO || DEFAULT_REPO;
  const ref = process.env.RENDER_PROMPTS_COMMIT || FALLBACK_COMMIT;
  const path = "tools/render-engine/prompts/custom_gpt_instructions.md";
  const rawUrl = `https://raw.githubusercontent.com/${repo}/${ref}/${path}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(rawUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      // Not found or error
      // eslint-disable-next-line no-console
      console.warn(`loadInstructions: raw fetch failed ${res.status} ${rawUrl}`);
      return null;
    }
    const txt = await res.text();
    return txt || null;
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.warn("loadInstructions: fetch error", String(e));
    return null;
  }
}

/**
 * Optional tenant override lookup.
 * This attempts to use Supabase service client if available. It is best-effort;
 * failures fall through to the canonical fetch.
 *
 * The function assumes you have a table (or key) to store per-tenant instructions,
 * e.g., table "tenant_settings" with columns: tenant_id (pk), custom_gpt_instructions (text).
 *
 * You can change the query to match your schema. If you don't want tenant overrides,
 * this function can be a no-op.
 */
async function fetchTenantOverride(tenantId?: string | null): Promise<string | null> {
  if (!tenantId) return null;
  try {
    // lazy require to avoid bundling issues when Supabase client is not available in some runtimes
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getServiceSupabaseClient } = require("@/lib/supabase");
    const sb: SupabaseClient = getServiceSupabaseClient();
    // Adjust table/column names to your project schema if different
    const { data, error } = await sb
      .from("tenant_settings")
      .select("custom_gpt_instructions")
      .eq("tenant_id", tenantId)
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }
    const txt = (data as any).custom_gpt_instructions;
    return typeof txt === "string" && txt.length > 0 ? txt : null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("loadInstructions: tenant override lookup failed:", String(e));
    return null;
  }
}

/**
 * Public loader
 * - tenantId optional; if provided, attempt tenant override first
 * - caches the canonical fetch result for DEFAULT_TTL seconds
 */
export async function loadCustomGptInstructions(tenantId?: string | null): Promise<string | null> {
  // 1) tenant override
  try {
    const tenantTxt = await fetchTenantOverride(tenantId ?? null);
    if (tenantTxt) return tenantTxt;
  } catch (e) {
    // ignore — best-effort
  }

  // 2) cached canonical fetch
  const now = Date.now();
  if (cached && (now - cached.fetchedAt) / 1000 < DEFAULT_TTL) {
    return cached.value;
  }

  const fetched = await fetchFromGithubRaw();
  cached = { value: fetched, fetchedAt: Date.now() };
  return fetched;
}

/**
 * Utility to clear cache (useful in tests)
 */
export function clearLoadInstructionsCache() {
  cached = null;
}

export default loadCustomGptInstructions;
