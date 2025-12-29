import { createClient } from "@supabase/supabase-js";
import { normalizeSupplierName, normalizeSku, normalizeNdcItemCode, normalizeProductName } from "./normalize";
import { getConnector } from "./connectors/registry";
import { isSafePublicUrl, domainOf } from "./netSafety";
import { verifyCandidateUrl } from "./verify";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Step 1: phase 1 index lookup
async function lookupIndex(tenantId: string, supplierKey: string, skuNorm?: string | null, ndcNorm?: string | null) {
  if (ndcNorm) {
    const { data } = await supabaseAdmin
      .from("product_source_index")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("supplier_key", supplierKey)
      .eq("ndc_item_code_norm", ndcNorm)
      .limit(1)
      .maybeSingle();
    if (data) return { row: data, matchedBy: "index:supplier+ndc" };
  }
  if (skuNorm) {
    const { data } = await supabaseAdmin
      .from("product_source_index")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("supplier_key", supplierKey)
      .eq("sku_norm", skuNorm)
      .limit(1)
      .maybeSingle();
    if (data) return { row: data, matchedBy: "index:supplier+sku" };
  }
  return null;
}

export async function resolveSkuToUrl(params: {
  tenantId: string;
  supplierName?: string | null;
  supplierKey: string;
  sku?: string | null;
  ndcItemCode?: string | null;
  productName?: string | null;
  brandName?: string | null;
}) {
  const tenantId = params.tenantId;
  const supplierKey = (params.supplierKey || "").toString().toLowerCase();
  const skuNorm = normalizeSku(params.sku || "");
  const ndcNorm = normalizeNdcItemCode(params.ndcItemCode || "");
  const productNameNorm = normalizeProductName(params.productName || "");

  // Phase 1: index lookup
  const idx = await lookupIndex(tenantId, supplierKey, skuNorm || undefined, ndcNorm || undefined);
  if (idx && idx.row) {
    return {
      status: "resolved_confident",
      resolved_url: idx.row.source_url,
      confidence: Number(idx.row.confidence || 1),
      matched_by: idx.matchedBy,
      signals: idx.row.signals ?? {}
    };
  }

  // Phase 2: connector discovery
  const connector = getConnector(supplierKey || "generic");
  const input = {
    tenantId,
    supplierKey,
    supplierName: params.supplierName,
    sku: params.sku,
    skuNorm,
    ndcItemCode: params.ndcItemCode,
    ndcItemCodeNorm: ndcNorm,
    productName: params.productName,
    productNameNorm,
    brandName: params.brandName
  };
  const cRes = await connector.resolveCandidates(input);
  let candidates = (cRes?.candidates ?? []).filter((c: any) => isSafePublicUrl(c.url));
  // dedupe
  const seen = new Set<string>();
  candidates = candidates.filter((c: any) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  }).slice(0, 10);

  // verify top candidates (sequential/concurrency simple)
  const verified: any[] = [];
  for (const c of candidates) {
    try {
      const v = await verifyCandidateUrl(input, c.url);
      verified.push({ candidate: c, verify: v });
    } catch (err) {
      verified.push({ candidate: c, verify: { ok: false, score: 0, signals: ["verify_failed"], error: String((err as any)?.message ?? err) }});
    }
  }

  verified.sort((a, b) => (b.verify.score || 0) - (a.verify.score || 0));
  const best = verified[0];
  if (!best) {
    return { status: "unresolved", candidates: candidates.slice(0, 3) };
  }
  const score = Number(best.verify.score ?? 0);

  if (best.verify.ok && score >= 0.75) {
    // upsert into index (use comma-separated onConflict to satisfy supabase-js typing)
    try {
      const now = new Date().toISOString();
      const upsertPayload: any = {
        tenant_id: tenantId,
        supplier_key: supplierKey,
        supplier_name: params.supplierName ?? null,
        sku: params.sku ?? null,
        sku_norm: skuNorm || null,
        ndc_item_code: params.ndcItemCode ?? null,
        ndc_item_code_norm: ndcNorm || null,
        product_name: params.productName ?? null,
        brand_name: params.brandName ?? null,
        source_url: best.candidate.url,
        source_domain: domainOf(best.candidate.url) || null,
        confidence: Math.min(1, score),
        signals: best.verify.signals ?? {},
        last_seen_at: now,
        updated_at: now,
        created_at: now
      };
      await supabaseAdmin.from("product_source_index").upsert(upsertPayload, { onConflict: "tenant_id,supplier_key,sku_norm" });
    } catch (err) {
      // swallow upsert errors but log
      console.warn("product_source_index upsert failed:", err);
    }

    return {
      status: "resolved_confident",
      resolved_url: best.candidate.url,
      confidence: score,
      matched_by: `connector:${best.candidate.method || "unknown"}`,
      signals: best.verify.signals
    };
  }

  if (score >= 0.55) {
    return { status: "resolved_needs_review", candidates: verified.map((v) => ({ url: v.candidate.url, score: v.verify.score, signals: v.verify.signals })).slice(0, 5) };
  }

  return { status: "unresolved", candidates: verified.map((v) => ({ url: v.candidate.url, score: v.verify.score, signals: v.verify.signals })).slice(0, 5) };
}
