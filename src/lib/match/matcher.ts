// High-level per-row matcher that uses SerpAPI and validatePageBasic to produce candidates.
// Updates match_url_job_rows (candidates, status, confidence) and optionally product_source_index.
import { createClient } from "@supabase/supabase-js";
import { serpApiSearch, validatePageBasic, SearchResult } from "./serp";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase env vars for matcher");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const SERPAPI_KEY = process.env.SERPAPI_KEY ?? "";
const SEARCH_MAX_RESULTS = Number(process.env.SEARCH_MAX_RESULTS ?? 5);
const VALIDATION_THRESHOLD = Number(process.env.VALIDATION_CONFIDENCE_THRESHOLD ?? 0.65);

function normalizeSupplierDomain(supplierKey?: string | null, supplierName?: string | null) {
  if (!supplierKey && !supplierName) return null;
  const base = (supplierKey ?? supplierName ?? "").toString().toLowerCase().replace(/\s+/g, "");
  // best-effort: remove non-alphanum
  return base.replace(/[^a-z0-9]/g, "");
}

/**
 * Build a prioritized list of queries for a row.
 */
function buildQueries(row: any): string[] {
  const q: string[] = [];
  const sku = (row.sku ?? "").toString().trim();
  const skuNorm = (row.sku_norm ?? "").toString().trim();
  const productName = (row.product_name ?? "").toString().trim();
  const brand = (row.brand_name ?? "").toString().trim();
  const supplier = (row.supplier_name ?? "").toString().trim();
  const supplierKey = (row.supplier_key ?? "").toString().trim();
  const ndc = (row.ndc_item_code ?? "").toString().trim();

  if (sku) {
    if (supplier) q.push(`${sku} ${supplier}`);
    if (supplierKey) q.push(`${sku} ${supplierKey}`);
    q.push(`${sku} ${productName}`.trim());
    q.push(sku);
  }

  if (ndc) {
    q.push(ndc);
  }

  if (productName) {
    if (brand) q.push(`"${productName}" ${brand}`);
    q.push(`"${productName}"`);
    q.push(`${productName} ${supplier}`);
  }

  // dedupe while preserving order
  const seen = new Set<string>();
  return q.filter((s) => {
    if (!s) return false;
    const k = s.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Given a job row, attempt to find candidate URLs and update the DB row.
 * Returns an object summarizing outcome.
 */
export async function processRow(row: any) {
  const queries = buildQueries(row);
  const supplierDomainHint = normalizeSupplierDomain(row.supplier_key, row.supplier_name);
  const sku = row.sku ?? null;
  const ndc = row.ndc_item_code ?? null;
  const productName = row.product_name ?? null;

  // Collect candidate URLs (dedup)
  const candidatesMap = new Map<string, { url: string; title?: string; snippet?: string; source: string }>();

  // Run SerpAPI for each query if available
  if (SERPAPI_KEY) {
    for (const q of queries) {
      const results = await serpApiSearch(q, SERPAPI_KEY, SEARCH_MAX_RESULTS);
      for (const r of results) {
        if (!r.url) continue;
        const key = r.url.split("#")[0];
        if (!candidatesMap.has(key)) candidatesMap.set(key, { url: key, title: r.title, snippet: r.snippet, source: "serpapi" });
      }
      if (candidatesMap.size >= SEARCH_MAX_RESULTS) break;
    }
  }

  // If no candidates found via SerpAPI, return unresolved (caller can retry later)
  if (candidatesMap.size === 0) {
    // update row to unresolved (ensures status is not stuck on queued)
    await supabaseAdmin
      .from("match_url_job_rows")
      .update({ status: "unresolved", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return { ok: false, reason: "no_candidates" };
  }

  // Validate top candidates (lightweight fetch + token checks)
  const candidatesArr = Array.from(candidatesMap.values()).slice(0, SEARCH_MAX_RESULTS);
  const validated: Array<{ url: string; score: number; matchedTokens?: string[]; domain?: string; source: string; snippet?: string }> = [];

  for (const c of candidatesArr) {
    try {
      const v = await validatePageBasic(c.url, { sku, ndc, name: productName, supplierDomain: supplierDomainHint });
      if (v.ok) {
        validated.push({ url: c.url, score: v.score, matchedTokens: v.matchedTokens, domain: v.domain ?? null, source: c.source, snippet: c.snippet ?? v.snippet });
      } else {
        // keep low-score candidate
        validated.push({ url: c.url, score: 0, matchedTokens: [], domain: null, source: c.source, snippet: c.snippet });
      }
    } catch (err) {
      validated.push({ url: c.url, score: 0, matchedTokens: [], domain: null, source: c.source, snippet: c.snippet });
    }
  }

  // Choose best candidate
  validated.sort((a, b) => b.score - a.score);
  const best = validated[0];

  if (!best || best.score < VALIDATION_THRESHOLD) {
    // Not confident enough — update row to unresolved with candidates (so UI can inspect)
    const candidateRecords = validated.map((v) => ({ url: v.url, domain: v.domain ?? null, score: v.score, source: v.source, snippet: v.snippet }));
    await supabaseAdmin
      .from("match_url_job_rows")
      .update({ candidates: candidateRecords, status: "unresolved", confidence: Math.max(...candidateRecords.map(c => c.score), 0), updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return { ok: false, reason: "low_confidence", candidates: candidateRecords };
  }

  // Accept candidate: update row as resolved_confident
  const resolvedDomain = best.domain ?? (() => { try { return new URL(best.url).hostname.replace(/^www\./, ""); } catch { return null; } })();
  const acceptedCandidate = { url: best.url, domain: resolvedDomain, score: best.score, source: best.source, snippet: best.snippet };

  try {
    await supabaseAdmin
      .from("match_url_job_rows")
      .update({
        candidates: [acceptedCandidate],
        status: "resolved_confident",
        resolved_url: best.url,
        resolved_domain: resolvedDomain,
        confidence: best.score,
        matched_by: "serpapi:auto",
        updated_at: new Date().toISOString()
      })
      .eq("id", row.id);
  } catch (err) {
    console.warn("Failed to update row with accepted candidate:", err);
  }

  // Upsert minimal product_source_index entry (best-effort) to improve future matches
  try {
    const now = new Date().toISOString();
    const payload: any = {
      tenant_id: row.tenant_id,
      supplier_key: row.supplier_key ?? (row.supplier_name ?? "").toString().toLowerCase().replace(/\s+/g, "_"),
      supplier_name: row.supplier_name ?? null,
      sku: row.sku ?? null,
      sku_norm: row.sku_norm ?? null,
      ndc_item_code: row.ndc_item_code ?? null,
      ndc_item_code_norm: row.ndc_item_code_norm ?? null,
      product_name: row.product_name ?? null,
      brand_name: row.brand_name ?? null,
      source_url: best.url,
      source_domain: resolvedDomain,
      confidence: best.score,
      signals: { matched_by: "serpapi:auto" },
      last_seen_at: now,
      updated_at: now,
      created_at: now
    };
    await supabaseAdmin.from("product_source_index").upsert(payload, { onConflict: "tenant_id,supplier_key,sku_norm" });
  } catch (err) {
    // best-effort only
    console.warn("product_source_index upsert failed:", err);
  }

  return { ok: true, accepted: acceptedCandidate };
}
