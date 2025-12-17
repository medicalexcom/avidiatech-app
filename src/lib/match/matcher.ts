// High-level per-row matcher that uses SerpAPI and validatePageBasic to produce candidates.
// Updated: only accepts manufacturer's official domain by default.
// If ALLOW_RESELLERS=true in env, it will fall back to reseller acceptance (legacy behavior).

import { createClient } from "@supabase/supabase-js";
import { serpApiSearch, validatePageBasic, hostnameFromUrl, SearchResult } from "./serp";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase env vars for matcher");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const SERPAPI_KEY = process.env.SERPAPI_KEY ?? "";
const SEARCH_MAX_RESULTS = Number(process.env.SEARCH_MAX_RESULTS ?? 5);
const VALIDATION_THRESHOLD = Number(process.env.VALIDATION_CONFIDENCE_THRESHOLD ?? 0.65);
const ALLOW_RESELLERS = String(process.env.ALLOW_RESELLERS ?? "false").toLowerCase() === "true";

function normalizeSupplierKey(s?: string | null) {
  if (!s) return "";
  return s.toString().toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
}

/**
 * Try to resolve a manufacturer's canonical domain for the supplier:
 * 1) Look up product_source_index entries for supplier_key and pick top source_domain that looks authoritative.
 * 2) If none, fall back to searching SerpAPI for "<supplier_name> official site" and use top result domain if it looks like the manufacturer.
 */
async function resolveManufacturerDomain(row: any): Promise<string | null> {
  const supplierKey = row.supplier_key ?? normalizeSupplierKey(row.supplier_name);
  const supplierName = (row.supplier_name ?? "").toString().trim();
  const tenantId = row.tenant_id ?? null;

  // 1) Try product_source_index
  try {
    const { data } = await supabaseAdmin
      .from("product_source_index")
      .select("source_domain")
      .eq("tenant_id", tenantId)
      .eq("supplier_key", supplierKey)
      .limit(5);

    if (Array.isArray(data) && data.length) {
      // prefer domains that include supplierKey or supplierName tokens
      const candidates = data.map((d: any) => (typeof d.source_domain === "string" ? d.source_domain.replace(/^www\./, "").toLowerCase() : null)).filter(Boolean);
      // pick first that contains supplierKey or supplierName token
      for (const c of candidates) {
        if (!c) continue;
        if (supplierKey && c.includes(supplierKey)) return c;
        if (supplierName && c.includes(supplierName.toLowerCase().replace(/\s+/g, ""))) return c;
      }
      // otherwise return first
      if (candidates.length) return candidates[0];
    }
  } catch (err) {
    // ignore DB lookup errors, continue to SerpAPI step
    console.warn("resolveManufacturerDomain: product_source_index lookup failed", String(err));
  }

  // 2) Use SerpAPI to find an "official" site
  if (!SERPAPI_KEY) return null;
  const queries = [
    `${supplierName} official site`,
    `${supplierName} manufacturer official website`,
    `${supplierName} company website`,
    `${supplierName} official website`
  ].filter(Boolean);

  for (const q of queries) {
    try {
      const res = await serpApiSearch(q, SERPAPI_KEY, 5);
      if (!res || res.length === 0) continue;
      for (const r of res) {
        const host = hostnameFromUrl(r.url);
        if (!host) continue;
        // heuristics: host contains normalized supplier key or supplier name token
        const normHost = host.toLowerCase();
        const normSupplierKey = normalizeSupplierKey(supplierKey);
        const normSupplierName = supplierName.toLowerCase().replace(/\s+/g, "");
        if ((normSupplierKey && normHost.includes(normSupplierKey)) || (supplierName && normHost.includes(normSupplierName)) || /^(?:[^.]*?)acon(?:[^.]*)\.|acon-lab|aconlabs/.test(normHost)) {
          return normHost;
        }
      }
      // if no heuristic match, return top domain as best guess
      const top = res[0];
      const hostTop = hostnameFromUrl(top.url);
      if (hostTop) return hostTop;
    } catch (err) {
      // ignore and try next query
      console.warn("resolveManufacturerDomain: serpApiSearch error", String(err));
    }
  }

  return null;
}

/**
 * Build prioritized list of queries for a row.
 */
function buildQueries(row: any): string[] {
  const q: string[] = [];
  const sku = (row.sku ?? "").toString().trim();
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

  if (ndc) q.push(ndc);

  if (productName) {
    if (brand) q.push(`"${productName}" ${brand}`);
    q.push(`"${productName}"`);
    q.push(`${productName} ${supplier}`);
  }

  // dedupe
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
 * Updated behavior: only accept manufacturer-domain candidates unless ALLOW_RESELLERS=true.
 */
export async function processRow(row: any) {
  const queries = buildQueries(row);
  const sku = row.sku ?? null;
  const ndc = row.ndc_item_code ?? null;
  const productName = row.product_name ?? null;
  const supplierKey = row.supplier_key ?? normalizeSupplierKey(row.supplier_name);
  const supplierName = row.supplier_name ?? null;

  // Resolve manufacturer domain first (best-effort)
  const manufacturerDomain = await resolveManufacturerDomain(row);
  if (!manufacturerDomain && !ALLOW_RESELLERS) {
    // update row to unresolved (no manufacturer site found and resellers not allowed)
    await supabaseAdmin
      .from("match_url_job_rows")
      .update({ status: "unresolved", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return { ok: false, reason: "no_manufacturer_domain" };
  }

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

  // If candidate pool is empty and resellers allowed, optionally try broader search (legacy)
  if (candidatesMap.size === 0) {
    if (ALLOW_RESELLERS && SERPAPI_KEY) {
      for (const q of queries) {
        const results = await serpApiSearch(q, SERPAPI_KEY, SEARCH_MAX_RESULTS * 2);
        for (const r of results) {
          if (!r.url) continue;
          const key = r.url.split("#")[0];
          if (!candidatesMap.has(key)) candidatesMap.set(key, { url: key, title: r.title, snippet: r.snippet, source: "serpapi" });
        }
        if (candidatesMap.size >= SEARCH_MAX_RESULTS) break;
      }
    } else {
      // no candidates and resellers not allowed => unresolved
      await supabaseAdmin
        .from("match_url_job_rows")
        .update({ status: "unresolved", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      return { ok: false, reason: "no_candidates" };
    }
  }

  // Filter candidates to only manufacturer domain unless ALLOW_RESELLERS=true
  let candidateList = Array.from(candidatesMap.values());
  if (!ALLOW_RESELLERS && manufacturerDomain) {
    candidateList = candidateList.filter((c) => {
      const host = hostnameFromUrl(c.url);
      if (!host) return false;
      // Accept if host equals or endsWith the manufacturerDomain
      return host === manufacturerDomain || host.endsWith(`.${manufacturerDomain}`);
    });

    if (candidateList.length === 0) {
      // no manufacturer-domain candidates found
      await supabaseAdmin
        .from("match_url_job_rows")
        .update({ status: "unresolved", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      return { ok: false, reason: "no_manufacturer_candidates" };
    }
  }

  // Validate top candidates (lightweight fetch + token checks)
  const validated: Array<{ url: string; score: number; matchedTokens?: string[]; domain?: string; source: string; snippet?: string }> = [];
  const topCandidates = candidateList.slice(0, SEARCH_MAX_RESULTS);

  for (const c of topCandidates) {
    try {
      const v = await validatePageBasic(c.url, { sku, ndc, name: productName, supplierDomain: manufacturerDomain ?? supplierKey });
      if (v.ok) {
        validated.push({ url: c.url, score: v.score, matchedTokens: v.matchedTokens, domain: v.domain ?? null, source: c.source, snippet: c.snippet ?? v.snippet });
      } else {
        validated.push({ url: c.url, score: 0, matchedTokens: [], domain: hostnameFromUrl(c.url), source: c.source, snippet: c.snippet });
      }
    } catch (err) {
      validated.push({ url: c.url, score: 0, matchedTokens: [], domain: hostnameFromUrl(c.url), source: c.source, snippet: c.snippet });
    }
  }

  // Choose best candidate
  validated.sort((a, b) => b.score - a.score);
  const best = validated[0];

  if (!best || best.score < VALIDATION_THRESHOLD) {
    // Not confident enough — update row to unresolved with candidates only if they are from manufacturer domain (or if ALLOW_RESELLERS)
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
        matched_by: "serpapi:manufacturer_only",
        updated_at: new Date().toISOString()
      })
      .eq("id", row.id);
  } catch (err) {
    console.warn("Failed to update row with accepted candidate:", err);
  }

  // Upsert minimal product_source_index entry (best-effort) to improve future matches (keep source_domain = manufacturer)
  try {
    const now = new Date().toISOString();
    const payload: any = {
      tenant_id: row.tenant_id,
      supplier_key: row.supplier_key ?? normalizeSupplierKey(row.supplier_name),
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
      signals: { matched_by: "serpapi:manufacturer_only" },
      last_seen_at: now,
      updated_at: now,
      created_at: now
    };
    await supabaseAdmin.from("product_source_index").upsert(payload, { onConflict: "tenant_id,supplier_key,sku_norm" });
  } catch (err) {
    console.warn("product_source_index upsert failed:", err);
  }

  return { ok: true, accepted: acceptedCandidate };
}
