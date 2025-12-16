/**
 * Helpers to auto-create a monitor watch when an ingestion/product is created.
 *
 * - export createWatchForIngestion(supabaseAdmin, payload)
 * - Call this from your upload/import or SEO creation route after you know the canonical source_url or product URL.
 *
 * Payload example:
 * { source_url: "https://vendor.com/p/123", product_id: "<uuid>", tenant_id: "...", created_by: "user_..." }
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function createWatchForIngestion(payload: {
  source_url: string;
  product_id?: string | null;
  tenant_id?: string | null;
  created_by?: string | null;
  frequency_seconds?: number | null;
}) {
  if (!payload?.source_url) throw new Error("source_url required");
  // normalize URL maybe remove query string sticky params
  const normalized = new URL(payload.source_url);
  normalized.hash = "";
  // optional: drop tracking params, implement later
  const sourceUrl = normalized.toString();

  // avoid duplicates: check existing watch for same URL
  const { data: existing } = await supabaseAdmin
    .from("monitor_watches")
    .select("*")
    .eq("source_url", sourceUrl)
    .limit(1)
    .maybeSingle();

  if (existing) {
    // optionally attach product_id if missing
    if (payload.product_id && !existing.product_id) {
      await supabaseAdmin.from("monitor_watches").update({ product_id: payload.product_id }).eq("id", existing.id);
    }
    return existing;
  }

  const insert = {
    source_url: sourceUrl,
    product_id: payload.product_id ?? null,
    tenant_id: payload.tenant_id ?? null,
    created_by: payload.created_by ?? null,
    frequency_seconds: payload.frequency_seconds ?? 86400,
    auto_watch: true,
  };

  const { data, error } = await supabaseAdmin.from("monitor_watches").insert([insert]).select("*").maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Example usage to drop into your upload route after upload + ingest creation:
 *
 * import { createWatchForIngestion } from '@/lib/monitor/hooks';
 * await createWatchForIngestion({ source_url: canonicalUrl, product_id: createdProductId, created_by: userId });
 */
