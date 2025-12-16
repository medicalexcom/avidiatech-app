import { createClient } from "@supabase/supabase-js";
import { domainOf } from "@/lib/match/netSafety";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function indexFromIngestion(payload: {
  tenant_id: string;
  supplier_key: string;
  supplier_name?: string;
  sku?: string | null;
  sku_norm?: string | null;
  ndc_item_code?: string | null;
  ndc_item_code_norm?: string | null;
  product_name?: string | null;
  brand_name?: string | null;
  source_url: string;
  source_ingestion_id?: string | null;
  confidence?: number;
  signals?: any;
}) {
  try {
    const now = new Date().toISOString();
    const upsertPayload: any = {
      tenant_id: payload.tenant_id,
      supplier_key: payload.supplier_key,
      supplier_name: payload.supplier_name ?? null,
      sku: payload.sku ?? null,
      sku_norm: payload.sku_norm ?? null,
      ndc_item_code: payload.ndc_item_code ?? null,
      ndc_item_code_norm: payload.ndc_item_code_norm ?? null,
      product_name: payload.product_name ?? null,
      brand_name: payload.brand_name ?? null,
      source_url: payload.source_url,
      source_domain: domainOf(payload.source_url) || null,
      source_ingestion_id: payload.source_ingestion_id ?? null,
      confidence: payload.confidence ?? 1,
      signals: payload.signals ?? {},
      last_seen_at: now,
      updated_at: now,
      created_at: now,
    };

    // Supabase client's upsert onConflict expects a string (a column name or comma-separated column list).
    // Pass the conflict columns as a comma-separated string.
    await supabaseAdmin
      .from("product_source_index")
      .upsert(upsertPayload, { onConflict: "tenant_id,supplier_key,sku_norm" });

    return { ok: true };
  } catch (err: any) {
    console.warn("indexFromIngestion failed:", err);
    return { ok: false, error: String(err?.message ?? err) };
  }
}
