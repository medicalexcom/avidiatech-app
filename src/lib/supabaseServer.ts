// Simple Supabase server helper for AvidiaDescribe
// - Uses SERVICE_ROLE key (server only)
// - Exposes: saveIngestion, incrementUsageCounter, checkQuota
//
// IMPORTANT: keep SUPABASE_SERVICE_ROLE_KEY secret and only use on server side.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) {
  console.warn("Supabase service role key or URL not configured. Supabase helpers will throw if used.");
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
    type,
    status,
    normalized_payload: normalizedPayload ?? null,
    raw_payload: rawPayload ?? null,
    user_id: userId ?? null,
    source_url: null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("product_ingestions").insert(payload).select("id").single();
  if (error) {
    console.error("saveIngestion error:", error);
    throw error;
  }
  return data;
}

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

  // Upsert row and increment count atomically with RPC or transaction if needed.
  // This example uses simple upsert pattern.
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("usage_counters")
    .upsert(
      {
        tenant_id: tenantId,
        metric,
        count: incrementBy,
        updated_at: now,
      },
      { onConflict: ["tenant_id", "metric"] }
    )
    .select();

  if (error) {
    console.error("incrementUsageCounter error:", error);
    throw error;
  }
  return true;
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

  // Query current counter
  const { data, error } = await supabase
    .from("usage_counters")
    .select("count")
    .eq("tenant_id", tenantId)
    .eq("metric", metric)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("checkQuota query error:", error);
    throw error;
  }

  const current = data?.count ?? 0;
  if (current >= limit) return false;
  return true;
}
