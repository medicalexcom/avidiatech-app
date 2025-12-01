/**
 * loadInstructions.ts (updated)
 *
 * Resolution order (best-effort):
 *  1) Tenant-specific override from Supabase (optional)
 *  2) Local canonical copy at tools/render-engine/prompts/custom_gpt_instructions.md (preferred)
 *  3) Canonical file from the medx-ingest-api repo via raw.githubusercontent.com
 *  4) Return null if nothing available (callers should fall back to defaults)
 *
 * This makes the runtime robust if the remote repo/commit path is wrong or inaccessible.
 */

import path from "path";
import fs from "fs/promises";

const DEFAULT_REPO = process.env.RENDER_PROMPTS_REPO || "medicalexcom/medx-ingest-api";
const FALLBACK_COMMIT = process.env.RENDER_PROMPTS_COMMIT || "34dd54c508824b84d2ad3cd21d782af219044718";
const DEFAULT_TTL = parseInt(process.env.RENDER_PROMPTS_TTL_SECONDS || "600", 10);

let cached: { value: string | null; fetchedAt: number } | null = null;

/* Try to read a local file (repo workspace). Returns string or null */
async function fetchFromLocalPaths(): Promise<string | null> {
  // candidate paths (repo-root relative)
  const candidates = [
    path.join(process.cwd(), "tools", "render-engine", "prompts", "custom_gpt_instructions.md"),
    path.join(process.cwd(), "tools", "render-engine", "prompts", "custom_gpt_instructions.txt"),
    path.join(process.cwd(), "tools", "render-engine", "prompts", "custom_gpt_instructions", "custom_gpt_instructions.md"),
    path.join(process.cwd(), "src", "tools", "render-engine", "prompts", "custom_gpt_instructions.md"),
  ];
  for (const p of candidates) {
    try {
      const stat = await fs.stat(p).catch(() => null);
      if (stat && stat.isFile()) {
        const txt = await fs.readFile(p, { encoding: "utf8" });
        if (txt && txt.trim().length > 0) {
          // eslint-disable-next-line no-console
          console.info("loadInstructions: loaded local prompt from", p);
          return txt;
        }
      }
    } catch (e: any) {
      // ignore and continue
    }
  }
  return null;
}

async function fetchFromGithubRaw(): Promise<string | null> {
  const repo = process.env.RENDER_PROMPTS_REPO || DEFAULT_REPO;
  const ref = process.env.RENDER_PROMPTS_COMMIT || FALLBACK_COMMIT;
  const pathOnRepo = "tools/render-engine/prompts/custom_gpt_instructions.md";
  const rawUrl = `https://raw.githubusercontent.com/${repo}/${ref}/${pathOnRepo}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(rawUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
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
 * Optional tenant override lookup via Supabase.
 * Best-effort; failure falls through to other sources.
 */
async function fetchTenantOverride(tenantId?: string | null): Promise<string | null> {
  if (!tenantId) return null;
  try {
    // lazy require to avoid bundling in edge runtimes
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getServiceSupabaseClient } = require("@/lib/supabase");
    const sb = getServiceSupabaseClient();
    const { data, error } = await sb
      .from("tenant_settings")
      .select("custom_gpt_instructions")
      .eq("tenant_id", tenantId)
      .limit(1)
      .single();
    if (error || !data) return null;
    const txt = (data as any).custom_gpt_instructions;
    return typeof txt === "string" && txt.trim().length > 0 ? txt : null;
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.warn("loadInstructions: tenant override lookup failed:", String(e));
    return null;
  }
}

/**
 * Public loader
 */
export async function loadCustomGptInstructions(tenantId?: string | null): Promise<string | null> {
  // 1) tenant override
  try {
    const tenantTxt = await fetchTenantOverride(tenantId ?? null);
    if (tenantTxt) return tenantTxt;
  } catch {
    // ignore
  }

  // 2) cached canonical fetch
  const now = Date.now();
  if (cached && (now - cached.fetchedAt) / 1000 < DEFAULT_TTL) {
    return cached.value;
  }

  // 3) local file (preferred)
  try {
    const local = await fetchFromLocalPaths();
    if (local) {
      cached = { value: local, fetchedAt: Date.now() };
      return local;
    }
  } catch (e) {
    // ignore local read errors
    // eslint-disable-next-line no-console
    console.warn("loadInstructions: local read attempt failed:", String(e));
  }

  // 4) remote fetch from GitHub raw
  const fetched = await fetchFromGithubRaw();
  cached = { value: fetched, fetchedAt: Date.now() };
  return fetched;
}

/**
 * Clear cache (for tests / manual refresh)
 */
export function clearLoadInstructionsCache() {
  cached = null;
}

export default loadCustomGptInstructions;
