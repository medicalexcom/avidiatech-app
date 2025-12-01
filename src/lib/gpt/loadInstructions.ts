// src/lib/gpt/loadInstructions.ts
/**
 * loadInstructions.ts (updated)
 *
 * Resolution order (best-effort):
 *  1) Tenant-specific override from Supabase (tenant_settings.custom_gpt_instructions or custom_gpt_instructions.instructions)
 *  2) Local canonical copy at tools/render-engine/prompts/custom_gpt_instructions.{md,txt}
 *  3) Canonical file from medx-ingest-api repo via raw.githubusercontent.com
 *  4) Return null if nothing available (callers should fall back to defaults)
 *
 * Exports:
 * - loadCustomGptInstructions(tenantId?) -> Promise<string|null>        // named + default (for backwards-compat)
 * - loadCustomGptInstructionsWithInfo(tenantId?)
 *      -> Promise<{ text: string|null, source: "tenant"|"local"|"remote"|"cache"|"none" }>
 * - clearLoadInstructionsCache()
 */

import path from "path";
import fs from "fs/promises";

const DEFAULT_REPO = process.env.RENDER_PROMPTS_REPO || "medicalexcom/medx-ingest-api";
const FALLBACK_COMMIT = process.env.RENDER_PROMPTS_COMMIT || "34dd54c508824b84d2ad3cd21d782af219044718";
const DEFAULT_TTL = parseInt(process.env.RENDER_PROMPTS_TTL_SECONDS || "600", 10);

type InstrSource = "tenant" | "local" | "remote" | "cache" | "none";

let cached: { value: string | null; fetchedAt: number; source: InstrSource } | null = null;

/** Try to read a local file (repo workspace). Returns string or null. */
async function fetchFromLocalPaths(): Promise<string | null> {
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
          console.info("loadInstructions: loaded local prompt from", p);
          return txt;
        }
      }
    } catch {
      // continue
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
      console.warn(`loadInstructions: raw fetch failed ${res.status} ${rawUrl}`);
      return null;
    }
    const txt = await res.text();
    return txt || null;
  } catch (e: any) {
    console.warn("loadInstructions: fetch error", String(e));
    return null;
  }
}

/** Optional tenant override lookup via Supabase (supports two schemas). */
async function fetchTenantOverride(tenantId?: string | null): Promise<string | null> {
  if (!tenantId) return null;
  try {
    // Lazy require to avoid bundling in edge runtimes
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getServiceSupabaseClient } = require("@/lib/supabase");
    const sb = getServiceSupabaseClient();

    // 1) New schema: tenant_settings.custom_gpt_instructions (text)
    const { data: tset, error: tsetErr } = await sb
      .from("tenant_settings")
      .select("custom_gpt_instructions")
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();

    if (!tsetErr && tset?.custom_gpt_instructions) {
      const txt = String(tset.custom_gpt_instructions);
      return txt.trim().length > 0 ? txt : null;
    }

    // 2) Legacy schema: custom_gpt_instructions.instructions (jsonb or text)
    const { data: legacy, error: legErr } = await sb
      .from("custom_gpt_instructions")
      .select("instructions")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!legErr && legacy?.instructions) {
      const ins = legacy.instructions;
      if (typeof ins === "string") return ins.trim().length > 0 ? ins : null;
      if (typeof ins === "object") {
        // If it’s a structured doc, stringify it so callers can still pass a single text block to the model
        const s = JSON.stringify(ins);
        return s.trim().length > 0 ? s : null;
      }
    }

    return null;
  } catch (e: any) {
    console.warn("loadInstructions: tenant override lookup failed:", String(e));
    return null;
  }
}

/** New: return text and source info so callers can include debug info in responses. */
export async function loadCustomGptInstructionsWithInfo(
  tenantId?: string | null
): Promise<{ text: string | null; source: InstrSource }> {
  // 1) Tenant override
  const tenantTxt = await fetchTenantOverride(tenantId ?? null).catch(() => null);
  if (tenantTxt) {
    cached = { value: tenantTxt, fetchedAt: Date.now(), source: "tenant" };
    return { text: tenantTxt, source: "tenant" };
  }

  // 2) Cached canonical fetch
  const now = Date.now();
  if (cached && (now - cached.fetchedAt) / 1000 < DEFAULT_TTL) {
    return { text: cached.value, source: "cache" };
  }

  // 3) Local file (preferred)
  try {
    const local = await fetchFromLocalPaths();
    if (local) {
      cached = { value: local, fetchedAt: Date.now(), source: "local" };
      return { text: local, source: "local" };
    }
  } catch (e) {
    console.warn("loadInstructions: local read attempt failed:", String(e));
  }

  // 4) Remote fetch from GitHub raw
  const fetched = await fetchFromGithubRaw();
  if (fetched) {
    cached = { value: fetched, fetchedAt: Date.now(), source: "remote" };
    return { text: fetched, source: "remote" };
  }

  // Nothing found
  cached = { value: null, fetchedAt: Date.now(), source: "none" };
  return { text: null, source: "none" };
}

/** Returns text only (named export) */
export async function loadCustomGptInstructions(tenantId?: string | null): Promise<string | null> {
  const info = await loadCustomGptInstructionsWithInfo(tenantId);
  return info.text;
}

/** Back-compat default export */
export default loadCustomGptInstructions;

/** Clear cache (for tests / manual refresh) */
export function clearLoadInstructionsCache() {
  cached = null;
}
