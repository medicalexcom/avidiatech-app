// url=https://github.com/medicalexcom/avidiatech-app/blob/main/src/lib/supabaseServer.ts
// Simple Supabase server helper for AvidiaDescribe
// - Uses SERVICE_ROLE key (server only)
// - Exposes: saveIngestion, incrementUsageCounter, checkQuota
//
// IMPORTANT: keep SUPABASE_SERVICE_ROLE_KEY secret and only use on server side.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !serviceKey) {
  console.warn("Supabase service role key or URL not configured. Supabase helpers will no-op when used.");
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

export async function saveIngestion({
  tenantId,
  type = "describe",
  status = "success",
  normalizedPayload,
  rawPayload,
  userId,
}: {
  tenantId: string | null;
  type?: string;
  status?: "success" | "failed";
  normalizedPayload?: any;
  rawPayload?: any;
  userId?: string | null;
}) {
  if (!url || !serviceKey) return { id: null };

  const payload = {
    tenant_id: tenantId,
    user_id: userId ?? null,
    type,
    source_url: null,
    status,
    normalized_payload: normalizedPayload ?? null,
    raw_payload: rawPayload ?? null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("product_ingestions").insert(payload).select("id").limit(1).single();
  if (error) {
    console.error("saveIngestion error:", error);
    throw error;
  }
  return data;
}

/**
 * incrementUsageCounter
 *
 * Safe, type-friendly implementation that:
 * - Fetches the existing counter row (if any)
 * - Updates it with a new increment (atomic enough for typical use; for heavy concurrency use an RPC)
 * - Inserts a new row if none exists
 */
export async function incrementUsageCounter({
  tenantId,
  metric = "describe_calls",
  incrementBy = 1,
}: {
  tenantId: string | null;
  metric?: string;
  incrementBy?: number;
}) {
  if (!url || !serviceKey) return null;

  const now = new Date().toISOString();

  try {
    // Try to fetch an existing counter row
    const { data: existing, error: fetchErr } = await supabase
      .from("usage_counters")
      .select("id, count")
      .eq("tenant_id", tenantId)
      .eq("metric", metric)
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      // If PostgREST returns "row not found" it's okay — otherwise bubble up
      console.error("incrementUsageCounter: fetch error", fetchErr);
      throw fetchErr;
    }

    if (existing && existing.id) {
      // Update existing row with new count
      const newCount = Number(existing.count ?? 0) + Number(incrementBy);
      const { error: updateErr } = await supabase
        .from("usage_counters")
        .update({ count: newCount, updated_at: now })
        .eq("id", existing.id);
      if (updateErr) {
        console.error("incrementUsageCounter: update error", updateErr);
        throw updateErr;
      }
      return true;
    } else {
      // Insert a new row
      const { error: insertErr } = await supabase
        .from("usage_counters")
        .insert([{ tenant_id: tenantId, metric, count: incrementBy, updated_at: now }]);
      if (insertErr) {
        console.error("incrementUsageCounter: insert error", insertErr);
        throw insertErr;
      }
      return true;
    }
  } catch (err) {
    console.error("incrementUsageCounter unexpected error:", err);
    throw err;
  }
}

export async function checkQuota({
  tenantId,
  metric = "describe_calls",
  limit = Infinity,
}: {
  tenantId: string | null;
  metric?: string;
  limit?: number;
}) {
  if (!url || !serviceKey) return true;

  try {
    const { data, error } = await supabase
      .from("usage_counters")
      .select("count")
      .eq("tenant_id", tenantId)
      .eq("metric", metric)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("checkQuota query error:", error);
      throw error;
    }

    const current = Number(data?.count ?? 0);
    return current < limit;
  } catch (err) {
    console.error("checkQuota unexpected error:", err);
    // Fail-open to avoid blocking when DB is unreachable; change if you prefer fail-closed
    return true;
  }
}
