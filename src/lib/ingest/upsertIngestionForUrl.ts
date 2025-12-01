// src/lib/ingest/upsertIngestionForUrl.ts
import { getServiceSupabaseClient } from "@/lib/supabase";

const FRESH_MIN = parseInt(process.env.INGEST_CACHE_MINUTES || "1440", 10); // 24h default

type IngestionRow = {
  id: string;
  url: string;
  updated_at: string;
  // other columns are present but not returned by this selection
};

export async function upsertIngestionForUrl(tenantId: string, url: string): Promise<IngestionRow> {
  const sb = getServiceSupabaseClient();

  // 1) Reuse a fresh record for this tenant + URL
  const { data: existing, error: exErr } = await sb
    .from("product_ingestions")
    .select("id, url, updated_at")
    .eq("tenant_id", tenantId)
    .eq("url", url)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (exErr) throw new Error(`INGEST_LOOKUP_FAILED:${exErr.message}`);

  if (existing?.length) {
    const last = existing[0]!;
    const ageMin = (Date.now() - new Date(last.updated_at).getTime()) / 60000;
    if (ageMin <= FRESH_MIN) return last as IngestionRow;
  }

  // 2) Call the ingestion engine
  const base = (process.env.INGEST_ENGINE_URL || "").replace(/\/+$/, "");
  if (!base) throw new Error("INGEST_ENGINE_URL_NOT_SET");

  const res = await fetch(`${base}/ingest?url=${encodeURIComponent(url)}`, {
    method: "GET",
    headers: { "content-type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`INGEST_ENGINE_FAILED:${res.status}`);
  }
  const engine = await res.json();

  // 3) Persist locally and return the row with id
  const { data: inserted, error: insErr } = await sb
    .from("product_ingestions")
    .insert({
      tenant_id: tenantId,
      url,
      raw_product: engine.rawProduct ?? null,
      structured_product: engine.structuredProduct ?? null,
      specs_normalized: engine.specsNormalized ?? null,
      manuals_normalized: engine.manualsNormalized ?? null,
      variants_normalized: engine.variantsNormalized ?? null,
      images_normalized: engine.imagesNormalized ?? null,
      source_seo: engine.sourceSeo ?? null,
      manufacturer_text: engine.manufacturerText ?? null,
    })
    .select("id, url, updated_at")
    .single();

  if (insErr || !inserted?.id) {
    throw new Error(`INGEST_PERSIST_FAILED:${insErr?.message || "NO_ID"}`);
  }
  return inserted as IngestionRow;
}
