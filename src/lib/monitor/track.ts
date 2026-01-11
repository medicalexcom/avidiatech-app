import { getServerSupabase } from "@/lib/supabase";
import { hashUrl, normalizeUrl, parseDomain } from "./url";

function uniqueAppend(arr: string[], v: string) {
  const s = new Set(arr);
  s.add(v);
  return Array.from(s);
}

function defaultWatchFlags() {
  return {
    price: true,
    specs: true,
    manuals: true,
    images: true,
    seo: true,
    variants: true,
  };
}

function defaultPolicy() {
  return {
    thresholds: {
      price_delta_pct: 2,
      spec_change_min: 1,
      manuals_change_any: true,
      images_change_any: true,
    },
    actions: {
      auto_refresh: "off", // "seo_only"|"full"|"off"
      auto_import: false,
    },
  };
}

function jitterMinutes(min: number, max: number) {
  const n = Math.floor(min + Math.random() * (max - min + 1));
  return n;
}

export async function trackUrl(opts: {
  tenantId: string;
  url: string;
  moduleName: string;
  externalSku?: string | null;
}): Promise<void> {
  const tenantId = (opts.tenantId || "").toString();
  if (!tenantId) throw new Error("trackUrl: tenantId required");
  if (!opts.url) throw new Error("trackUrl: url required");

  const url_norm = normalizeUrl(opts.url);
  const url_hash = hashUrl(url_norm);
  const domain = parseDomain(url_norm);

  const supabase = getServerSupabase();

  // Load existing (if any)
  const existing = await supabase
    .from("monitor_watchlist")
    .select("id, source_modules, status, frequency_minutes")
    .eq("tenant_id", tenantId)
    .eq("url_hash", url_hash)
    .limit(1)
    .maybeSingle();

  if (existing.error) throw new Error(`trackUrl: select_failed:${existing.error.message}`);

  const now = new Date();
  const baseInsert: any = {
    tenant_id: tenantId,
    url: opts.url,
    url_norm,
    url_hash,
    domain,
    external_sku: opts.externalSku ?? null,
    source_modules: [opts.moduleName],
    watch_flags: defaultWatchFlags(),
    policy: defaultPolicy(),
    // if new record, schedule soon with jitter to avoid herd
    next_run_at: new Date(now.getTime() + jitterMinutes(5, 30) * 60_000).toISOString(),
    status: "active",
  };

  if (!existing.data) {
    const ins = await supabase.from("monitor_watchlist").insert([baseInsert]);
    if (ins.error) throw new Error(`trackUrl: insert_failed:${ins.error.message}`);
    return;
  }

  // Merge source_modules without clobbering other fields.
  const mergedModules = uniqueAppend(existing.data.source_modules ?? [], opts.moduleName);

  const up = await supabase
    .from("monitor_watchlist")
    .update({
      url: opts.url, // keep most recent raw url
      url_norm,
      domain,
      external_sku: opts.externalSku ?? null,
      source_modules: mergedModules,
      // do not force resume if paused/error
    })
    .eq("id", existing.data.id)
    .eq("tenant_id", tenantId);

  if (up.error) throw new Error(`trackUrl: update_failed:${up.error.message}`);
}
