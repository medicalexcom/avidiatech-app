import { createClient } from "@supabase/supabase-js";
import { runWatchOnce } from "@/lib/monitor/core";

function getSupabaseAdmin() {
  const SUPABASE_URL = process.env.SUPABASE_URL || "";
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

export async function createWatchForIngestion(payload: {
  source_url: string;
  product_id?: string | null;
  tenant_id?: string | null;
  created_by?: string | null;
  frequency_seconds?: number | null;
  run_initial_check?: boolean; // NEW
}) {
  if (!payload?.source_url) throw new Error("source_url required");

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) throw new Error("monitor_watch_create_not_configured");

  let sourceUrl = payload.source_url;
  try {
    const normalized = new URL(payload.source_url);
    normalized.hash = "";
    sourceUrl = normalized.toString();
  } catch {
    sourceUrl = String(payload.source_url);
  }

  // existing?
  const { data: existing } = await supabaseAdmin
    .from("monitor_watches")
    .select("*")
    .eq("source_url", sourceUrl)
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (payload.product_id && !existing.product_id) {
      await supabaseAdmin.from("monitor_watches").update({ product_id: payload.product_id }).eq("id", existing.id);
    }
    if (payload.tenant_id && !existing.tenant_id) {
      await supabaseAdmin.from("monitor_watches").update({ tenant_id: payload.tenant_id }).eq("id", existing.id);
    }

    // NEW: best-effort initial check
    if (payload.run_initial_check) {
      (async () => {
        try {
          await runWatchOnce(String(existing.id));
        } catch (e) {
          console.warn("[monitor/hooks] runWatchOnce failed (existing watch, non-blocking):", String((e as any)?.message ?? e));
        }
      })();
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

  // NEW: best-effort initial check
  if (payload.run_initial_check && data?.id) {
    (async () => {
      try {
        await runWatchOnce(String(data.id));
      } catch (e) {
        console.warn("[monitor/hooks] runWatchOnce failed (new watch, non-blocking):", String((e as any)?.message ?? e));
      }
    })();
  }

  return data;
}
