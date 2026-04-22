// src/lib/supabaseServer.ts
// Central Supabase server helper used across ingestion/import flows.
//
// saveIngestion now:
// - enforces tenant presence (unless GLOBAL_TENANT_ID configured)
// - writes both tenant_id and org_id (org_id required by DB)
// - tolerantly strips unknown columns reported by PostgREST and retries
// - BEST-EFFORT: auto-creates a Monitor watch for Extract/SEO-style ingestions

import { createClient } from "@supabase/supabase-js";
import { createWatchForIngestion } from "@/lib/monitor/hooks";

const url = process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Fallback tenant id used ONLY when explicitly configured in env (dev convenience).
const GLOBAL_TENANT_ID = process.env.SUPABASE_GLOBAL_TENANT_ID ?? null;

if (!url || !serviceKey) {
  console.warn("Supabase service role or URL not configured. Supabase helpers will no-op when used.");
}

const supabase = (url && serviceKey)
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null;

/**
 * Parse missing column name from PostgREST schema-cache error message.
 * Example message:
 * "Could not find the 'raw_payload' column of 'product_ingestions' in the schema cache"
 */
function parseMissingColumnFromError(err: any): string | null {
  const msg = String(err?.message ?? err ?? "");
  const m = msg.match(/Could not find the '([^']+)' column/);
  if (m && m[1]) return m[1];
  const m2 = msg.match(/column "(.*?)" does not exist/i);
  if (m2 && m2[1]) return m2[1];
  return null;
}

/**
 * saveIngestion - insertion helper that enforces tenant presence (unless global fallback configured)
 * and tolerantly strips unknown columns reported by PostgREST on insert.
 *
 * Important: sets both tenant_id AND org_id to the effective tenant value to satisfy NOT NULL constraints.
 *
 * NEW: best-effort auto-create monitor watch for ingestion types that represent Extract/SEO-style work
 * (single or bulk). This is non-blocking and errors are swallowed so ingestion never fails because Monitor is down.
 */
export async function saveIngestion({
  tenantId,
  type = "describe",
  // Allow 'pending' to reflect pre-engine state
  status = "success",
  normalizedPayload,
  rawPayload,
  userId,
  sourceUrl,
}: {
  tenantId: string | null;
  type?: string;
  status?: "success" | "failed" | "pending";
  normalizedPayload?: any;
  rawPayload?: any;
  userId?: string | null;
  sourceUrl?: string | null;
}) {
  if (!url || !serviceKey || !supabase) return { id: null };

  const effectiveTenant = tenantId ?? GLOBAL_TENANT_ID ?? null;
  if (!effectiveTenant) {
    const err = new Error("missing_tenant_id_for_ingestion");
    console.error("saveIngestion blocked: missing tenant and no GLOBAL_TENANT_ID configured");
    throw err;
  }

  // Build a conservative payload using snake_case column names that are expected in DB.
  const basePayload: Record<string, any> = {
    tenant_id: effectiveTenant,
    org_id: effectiveTenant, // <- ensure org_id is written (DB requires it)
    user_id: userId ?? null,
    export_type: type,
    status,
    normalized_payload: normalizedPayload ?? null,
    // raw_payload may not exist in all environments
    raw_payload: rawPayload ?? null,
    created_at: new Date().toISOString(),
  };

  if (typeof sourceUrl === "string" && sourceUrl.length > 0) {
    basePayload.source_url = sourceUrl;
  }

  // Attempt insert. If DB complains about missing column(s), remove them and retry.
  const payload = { ...basePayload };
  const maxRetries = 5;
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      const { data, error } = await supabase
        .from("product_ingestions")
        .insert([payload])
        .select("id")
        .limit(1)
        .maybeSingle();

      if (error) {
        const missingColumn = parseMissingColumnFromError(error);
        if (missingColumn && attempt <= maxRetries) {
          console.warn(`saveIngestion: postgrest missing column '${missingColumn}' - removing and retrying (attempt ${attempt})`);
          delete payload[missingColumn];
          const camel = missingColumn.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
          delete payload[camel];
          continue;
        }

        console.error("saveIngestion error from supabase:", error);
        throw error;
      }

      // success

      // Auto-monitor only for ingestion types that represent Extract/SEO-style work.
      // This keeps Monitor focused on URLs that will be extracted/SEO'd/pipelined.
      const MONITORED_INGEST_TYPES = new Set(["extract", "seo", "ingest", "full", "pipeline"]);
      try {
        const typeKey = (type || "").toString().toLowerCase();
        if (sourceUrl && MONITORED_INGEST_TYPES.has(typeKey)) {
          // fire-and-forget so ingestion never blocks
          (async () => {
            try {
              await createWatchForIngestion({
                source_url: sourceUrl,
                product_id: (data as any)?.id ?? null,
                tenant_id: effectiveTenant,
                created_by: userId ?? null,
                frequency_seconds: null,
                run_initial_check: true,
              });
            } catch (cwErr) {
              // swallow errors - do not block ingestion flow
              console.warn("[saveIngestion] createWatchForIngestion failed (non-blocking):", String((cwErr as any)?.message ?? cwErr));
            }
          })();
        }
      } catch (guardErr) {
        console.warn("[saveIngestion] monitor spawn guard failed:", String((guardErr as any)?.message ?? guardErr));
      }

      return data;
    } catch (e: any) {
      const missingColumn = parseMissingColumnFromError(e);
      if (missingColumn && attempt <= maxRetries) {
        console.warn(`saveIngestion caught missing column '${missingColumn}' in exception - removing and retrying (attempt ${attempt})`);
        delete payload[missingColumn];
        const camel = missingColumn.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        delete payload[camel];
        continue;
      }
      throw e;
    }
  }
}

/* ---- Other helpers unchanged ---- */

const USAGE_COLUMN_BY_METRIC: Record<string, "ingestion_count" | "seo_count" | "variants_count" | "match_count"> = {
  describe_calls: "ingestion_count",
  ingestion: "ingestion_count",
  seo: "seo_count",
  variants: "variants_count",
  match: "match_count",
};

function resolveUsageColumn(metric: string) {
  return USAGE_COLUMN_BY_METRIC[metric] ?? "ingestion_count";
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
  if (!url || !serviceKey || !supabase) return null;

  const now = new Date().toISOString();
  const tenantKey = tenantId ?? GLOBAL_TENANT_ID;
  const usageColumn = resolveUsageColumn(metric);

  if (!tenantKey) {
    console.error("incrementUsageCounter blocked: missing tenantId and no GLOBAL_TENANT_ID configured");
    throw new Error("missing_tenant_id_for_ingestion");
  }

  try {
    // Canonical schema: one row per tenant with feature columns.
    const { data: existing, error: fetchErr } = await supabase
      .from("usage_counters")
      .select(`id, ${usageColumn}`)
      .eq("tenant_id", tenantKey)
      .limit(1)
      .maybeSingle();

    if (!fetchErr) {
      const current = Number((existing as any)?.[usageColumn] ?? 0);
      const next = current + Number(incrementBy);

      if ((existing as any)?.id) {
        const { error: updateErr } = await supabase
          .from("usage_counters")
          .update({ [usageColumn]: next, updated_at: now })
          .eq("id", (existing as any).id);
        if (updateErr) throw updateErr;
        return { ok: true, count: next, column: usageColumn };
      }

      const { error: insertErr } = await supabase.from("usage_counters").insert([{
        tenant_id: tenantKey,
        period_start: now,
        [usageColumn]: Number(incrementBy),
        created_at: now,
        updated_at: now,
      }]);
      if (insertErr) throw insertErr;
      return { ok: true, count: Number(incrementBy), column: usageColumn };
    }

    // Legacy fallback: row-per-metric table (metric/count columns).
    const { data: legacyExisting, error: legacyFetchErr } = await supabase
      .from("usage_counters")
      .select("count")
      .eq("tenant_id", tenantKey)
      .eq("metric", metric)
      .limit(1)
      .maybeSingle();
    if (legacyFetchErr) throw legacyFetchErr;

    if (legacyExisting && typeof legacyExisting.count !== "undefined") {
      const newCount = Number(legacyExisting.count ?? 0) + Number(incrementBy);
      const { error: updateErr } = await supabase
        .from("usage_counters")
        .update({ count: newCount, updated_at: now })
        .eq("tenant_id", tenantKey)
        .eq("metric", metric);
      if (updateErr) throw updateErr;
      return { ok: true, count: newCount, column: "count" };
    }

    const { error: insertErr } = await supabase
      .from("usage_counters")
      .insert([{ tenant_id: tenantKey, metric, count: incrementBy, created_at: now, updated_at: now }]);
    if (insertErr) throw insertErr;
    return { ok: true, count: Number(incrementBy), column: "count" };
  } catch (e) {
    console.error("incrementUsageCounter unexpected error", e);
    throw e;
  }
}

export async function checkQuota(opts: {
  tenantId: string | null;
  metric?: string;
  limit?: number;
}): Promise<boolean> {
  const { tenantId, metric = "describe_calls", limit = Infinity } = opts;

  if (!isFinite(limit)) return true;
  if (!url || !serviceKey || !supabase) {
    return true;
  }

  const tenantKey = tenantId ?? GLOBAL_TENANT_ID;
  const usageColumn = resolveUsageColumn(metric);
  if (!tenantKey) return true;

  try {
    const { data, error } = await supabase
      .from("usage_counters")
      .select(usageColumn)
      .eq("tenant_id", tenantKey)
      .limit(1)
      .maybeSingle();

    if (!error) {
      const current = Number((data as any)?.[usageColumn] ?? 0);
      return current < Number(limit);
    }

    // Legacy fallback
    const { data: legacyData, error: legacyError } = await supabase
      .from("usage_counters")
      .select("count")
      .eq("tenant_id", tenantKey)
      .eq("metric", metric)
      .limit(1)
      .maybeSingle();

    if (legacyError) {
      console.warn("checkQuota db error, failing open", legacyError);
      return true;
    }

    const legacyCurrent = Number((legacyData as any)?.count ?? 0);
    return legacyCurrent < Number(limit);
  } catch (e) {
    console.warn("checkQuota unexpected error, failing open", e);
    return true;
  }
}
