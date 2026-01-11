import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase service client helper.
 *
 * IMPORTANT TENANCY NOTE:
 * Historically this file used a GLOBAL_TENANT_ID fallback to avoid null inserts.
 * That is unsafe for connector imports (BigCommerce etc.) because it can route data
 * to the wrong tenant context.
 *
 * New behavior:
 * - saveIngestion is strict by default: tenantId must be present unless allowTenantFallback=true
 * - allowTenantFallback is only for controlled maintenance/dev workflows
 */

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: SupabaseClient | null = null;
if (url && serviceKey) {
  supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
}

const GLOBAL_TENANT_ID = process.env.GLOBAL_TENANT_ID || "";

export function getServiceSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error("supabase_not_configured: Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return supabase;
}

export async function saveIngestion(opts: {
  tenantId: string | null;
  userId: string | null;
  type: string;
  status: "created" | "processing" | "succeeded" | "failed";
  sourceUrl?: string | null;
  normalizedPayload?: any;
  rawPayload?: any;
  allowTenantFallback?: boolean; // default false
}) {
  const supabase = getServiceSupabaseClient();

  const allowFallback = Boolean(opts.allowTenantFallback);
  const tenantId = (opts.tenantId ?? "").toString().trim();

  // Strict by default
  if (!tenantId) {
    if (!allowFallback || !GLOBAL_TENANT_ID) {
      throw new Error("missing_tenant_id_for_insert");
    }
  }

  const payload: Record<string, any> = {
    tenant_id: tenantId || GLOBAL_TENANT_ID,
    user_id: opts.userId ?? null,
    type: opts.type,
    status: opts.status,
    normalized_payload: opts.normalizedPayload ?? null,
    raw_payload: opts.rawPayload ?? null,
    created_at: new Date().toISOString(),
  };

  if (typeof opts.sourceUrl === "string" && opts.sourceUrl.length > 0) {
    payload.source_url = opts.sourceUrl;
  }

  const { data, error } = await supabase
    .from("product_ingestions")
    .insert([payload])
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("saveIngestion error:", error);
    throw error;
  }
  return data;
}

/**
 * incrementUsageCounter / checkQuota keep old fallback semantics because quotas/usage
 * are not connector-critical and we don't want to break existing flows.
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
  if (!url || !serviceKey || !supabase) return null;

  const now = new Date().toISOString();
  const tenantKey = tenantId ?? GLOBAL_TENANT_ID;

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from("usage_counters")
      .select("count")
      .eq("tenant_id", tenantKey)
      .eq("metric", metric)
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      console.error("incrementUsageCounter: fetch error", fetchErr);
      throw fetchErr;
    }

    if (existing && typeof (existing as any).count !== "undefined") {
      const newCount = Number((existing as any).count ?? 0) + Number(incrementBy);
      const { error: updateErr } = await supabase
        .from("usage_counters")
        .update({ count: newCount, updated_at: now })
        .eq("tenant_id", tenantKey)
        .eq("metric", metric);
      if (updateErr) {
        console.error("incrementUsageCounter: update error", updateErr);
        throw updateErr;
      }
      return true;
    } else {
      const insertPayload: Record<string, any> = {
        tenant_id: tenantKey,
        metric,
        count: incrementBy,
        updated_at: now,
      };
      const { error: insertErr } = await supabase.from("usage_counters").insert([insertPayload]);
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
  if (!url || !serviceKey || !supabase) return true;

  const tenantKey = tenantId ?? GLOBAL_TENANT_ID;

  const { data: existing, error } = await supabase
    .from("usage_counters")
    .select("count")
    .eq("tenant_id", tenantKey)
    .eq("metric", metric)
    .limit(1)
    .maybeSingle();

  if (error) {
    // fail open
    return true;
  }

  const count = Number((existing as any)?.count ?? 0);
  return count < limit;
}
