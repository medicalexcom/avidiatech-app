// Per-row matcher: site-restricted SerpAPI queries + site-search patterns + enhanced validation.
// Exports:
// - processRow(row) : performs matching and updates DB (same as before, but stronger)
// - debugRowTrace(row) : runs pipeline without updating DB and returns full trace for debugging.

import { createClient } from "@supabase/supabase-js";
import { serpApiSearch, validatePageBasic, hostnameFromUrl, tokenOverlapScore, timeoutFetch } from "./serp";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase env vars for matcher");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const SERPAPI_KEY = process.env.SERPAPI_KEY ?? "";
const SEARCH_MAX_RESULTS = Number(process.env.SEARCH_MAX_RESULTS ?? 8);
const VALIDATION_THRESHOLD = Number(process.env.VALIDATION_CONFIDENCE_THRESHOLD ?? 0.65);
const ALLOW_RESELLERS = String(process.env.ALLOW_RESELLERS ?? "false").toLowerCase() === "true";

/** normalize supplier key heuristically */
function normalizeSupplierKey(s?: string | null) {
  if (!s) return "";
  return s.toString().toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
}

/** extract hrefs from HTML (simple) */
function extractHrefs(html: string, baseUrl?: string) {
  const hrefs: string[] = [];
  const regex = /href=(?:"|')([^"'#>]+)(?:"|')/gi;
  for (const m of html.matchAll(regex)) {
    try {
      const candidate = m[1];
      if (!candidate) continue;
      // resolve relative urls if base provided
      const url = baseUrl ? new URL(candidate, baseUrl).toString() : candidate;
      hrefs.push(url);
    } catch {
      // skip invalid URLs
    }
  }
  return hrefs;
}

/**
 * Resolve manufacturer's canonical domain:
 * 1) product_source_index lookup for source_domain
 * 2) SerpAPI "official site" queries fallback
 */
export async function resolveManufacturerDomain(row: any): Promise<string | null> {
  const supplierKey = row.supplier_key ?? normalizeSupplierKey(row.supplier_name);
  const supplierName = (row.supplier_name ?? "").toString().trim();
  const tenantId = row.tenant_id ?? null;

  // 1) check product_source_index
  try {
    const { data } = await supabaseAdmin
      .from("product_source_index")
      .select("source_domain")
      .eq("tenant_id", tenantId)
      .eq("supplier_key", supplierKey)
      .limit(6);

    if (Array.isArray(data) && data.length) {
      const candidates = data.map((d: any) => (typeof d.source_domain === "string" ? d.source_domain.replace(/^www\./, "").toLowerCase() : null)).filter(Boolean);
      for (const c of candidates) {
        if (!c) continue;
        if (supplierKey && c.includes(supplierKey)) return c;
        if (supplierName && c.includes(supplierName.toLowerCase().replace(/\s+/g, ""))) return c;
      }
      if (candidates.length) return candidates[0];
    }
  } catch (err) {
    console.warn("resolveManufacturerDomain: product_source_index lookup failed", String(err));
  }

  // 2) query SerpAPI for official site
  if (!SERPAPI_KEY || !supplierName) return null;
  const queries = [
    `${supplierName} official site`,
    `${supplierName} manufacturer official website`,
    `${supplierName} company website`,
    `${supplierName} official website`
  ];
  for (const q of queries) {
    try {
      const res = await serpApiSearch(q, SERPAPI_KEY, 5);
      if (!res || res.length === 0) continue;
      for (const r of res) {
        const host = hostnameFromUrl(r.url);
        if (!host) continue;
        const normHost = host.toLowerCase();
        const normSupplierKey = normalizeSupplierKey(supplierKey);
        const normSupplierName = supplierName.toLowerCase().replace(/\s+/g, "");
        if ((normSupplierKey && normHost.includes(normSupplierKey)) || (supplierName && normHost.includes(normSupplierName))) {
          return normHost;
        }
      }
      const top = res[0];
      const hostTop = hostnameFromUrl(top.url);
      if (hostTop) return hostTop;
    } catch (err) {
      console.warn("resolveManufacturerDomain: serp error", String(err));
    }
  }
  return null;
}

/** Build prioritized queries */
function buildQueries(row: any): string[] {
  const q: string[] = [];
  const sku = (row.sku ?? "").toString().trim();
  const productName = (row.product_name ?? "").toString().trim();
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
    if (supplier) q.push(`"${productName}" ${supplier}`);
    q.push(`"${productName}"`);
  }

  const seen = new Set<string>();
  return q.filter((s) => {
    if (!s) return false;
    const k = s.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Site search patterns to try when manufacturerDomain is known */
function buildSiteSearchUrls(domain: string, sku?: string | null, productName?: string | null) {
  const patterns: string[] = [];
  if (sku) {
    patterns.push(`https://${domain}/search?q=${encodeURIComponent(sku)}`);
    patterns.push(`https://${domain}/search?query=${encodeURIComponent(sku)}`);
    patterns.push(`https://${domain}/catalogsearch/result/?q=${encodeURIComponent(sku)}`);
    patterns.push(`https://${domain}/products?search=${encodeURIComponent(sku)}`);
  }
  if (productName) {
    patterns.push(`https://${domain}/search?q=${encodeURIComponent(productName)}`);
  }
  return patterns;
}

/** Validate candidate list and return validated results (non-db) */
async function validateCandidates(candidateList: Array<{ url: string; title?: string; snippet?: string; source: string }>, checks: any, manufacturerDomain?: string | null) {
  const validated: any[] = [];
  for (const c of candidateList.slice(0, SEARCH_MAX_RESULTS)) {
    try {
      const v = await validatePageBasic(c.url, { sku: checks.sku, ndc: checks.ndc, name: checks.name, supplierDomain: manufacturerDomain ?? checks.supplierKey });
      if (v.ok) {
        validated.push({ url: c.url, score: v.score, tokens: v.matchedTokens, domain: v.domain ?? hostnameFromUrl(c.url), source: c.source, snippet: c.snippet ?? v.snippet });
      } else {
        validated.push({ url: c.url, score: 0, tokens: [], domain: hostnameFromUrl(c.url), source: c.source, snippet: c.snippet });
      }
    } catch (err) {
      validated.push({ url: c.url, score: 0, tokens: [], domain: hostnameFromUrl(c.url), source: c.source, snippet: c.snippet });
    }
  }
  return validated;
}

/**
 * Debug trace for a single row. Does NOT update DB.
 * Returns manufacturerDomain, queries tried, serp results, siteSearch attempts, validation per candidate, and recommended chosen candidate (if any).
 */
export async function debugRowTrace(row: any) {
  const trace: any = { row_id: row.row_id ?? row.id, sku: row.sku ?? null, product_name: row.product_name ?? null, supplier_name: row.supplier_name ?? null, steps: [] };
  const queries = buildQueries(row);
  trace.steps.push({ step: "build_queries", queries });

  // resolve manufacturer domain
  const manufacturerDomain = await resolveManufacturerDomain(row);
  trace.manufacturerDomain = manufacturerDomain;

  // build site-restricted queries first if manufacturerDomain exists
  const siteQueries: string[] = [];
  if (manufacturerDomain) {
    if (row.sku) siteQueries.push(`site:${manufacturerDomain} ${row.sku}`);
    if (row.product_name) siteQueries.push(`site:${manufacturerDomain} "${row.product_name}"`);
    if (row.sku && row.product_name) siteQueries.push(`site:${manufacturerDomain} ${row.sku} ${row.product_name}`);
  }
  trace.steps.push({ step: "site_queries", siteQueries });

  // Run SerpAPI queries (siteQueries first)
  const serpResultsByQuery: any[] = [];
  if (SERPAPI_KEY) {
    const runQueries = [...siteQueries, ...queries];
    for (const q of runQueries) {
      const res = await serpApiSearch(q, SERPAPI_KEY, SEARCH_MAX_RESULTS);
      serpResultsByQuery.push({ query: q, results: res });
      // stop early if we have many candidates
      if (serpResultsByQuery.flatMap((s) => s.results ?? []).length >= SEARCH_MAX_RESULTS) break;
    }
  } else {
    serpResultsByQuery.push({ query: "SKIPPED (no SERPAPI_KEY)", results: [] });
  }
  trace.serp = serpResultsByQuery;

  // collect candidates deduped
  const candidatesMap = new Map<string, { url: string; title?: string; snippet?: string; source: string }>();
  for (const qres of serpResultsByQuery) {
    for (const r of qres.results ?? []) {
      const key = (r.url ?? "").split("#")[0];
      if (!key) continue;
      if (!candidatesMap.has(key)) candidatesMap.set(key, { url: key, title: r.title, snippet: r.snippet, source: "serpapi" });
    }
  }

  trace.candidate_pool_count = candidatesMap.size;

  // If no candidates and we have manufacturer domain, try site-search patterns
  const siteSearchs: any[] = [];
  if (manufacturerDomain && candidatesMap.size === 0) {
    const patterns = buildSiteSearchUrls(manufacturerDomain, row.sku, row.product_name);
    for (const p of patterns) {
      try {
        const r = await timeoutFetch(p, {}, Number(process.env.SEARCH_TIMEOUT_MS ?? 8000));
        if (!r.ok) { siteSearchs.push({ url: p, ok: false, status: r.status }); continue; }
        const html = await r.text();
        const hrefs = extractHrefs(html, p).slice(0, SEARCH_MAX_RESULTS);
        siteSearchs.push({ url: p, status: r.status, found: hrefs.length, hrefs });
        for (const h of hrefs) {
          const key = h.split("#")[0];
          if (!candidatesMap.has(key)) candidatesMap.set(key, { url: key, title: undefined, snippet: undefined, source: "site_search" });
        }
      } catch (err) {
        siteSearchs.push({ url: p, error: String((err as any)?.message ?? err) });
      }
      if (candidatesMap.size >= SEARCH_MAX_RESULTS) break;
    }
  }
  trace.siteSearchAttempts = siteSearchs;

  // filter candidates to manufacturer domain only unless ALLOW_RESELLERS
  let candidateList = Array.from(candidatesMap.values());
  trace.candidates_raw = candidateList.map((c) => ({ url: c.url, source: c.source }));

  if (!ALLOW_RESELLERS && manufacturerDomain) {
    candidateList = candidateList.filter((c) => {
      const host = hostnameFromUrl(c.url);
      if (!host) return false;
      return host === manufacturerDomain || host.endsWith(`.${manufacturerDomain}`);
    });
    trace.candidates_filtered_manufacturer = candidateList.map((c) => c.url);
    if (candidateList.length === 0) {
      trace.final = { ok: false, reason: "no_manufacturer_candidates" };
      return trace;
    }
  }

  // Validate candidates and collect results
  const checks = { sku: row.sku ?? null, ndc: row.ndc_item_code ?? null, name: row.product_name ?? null, supplierKey: row.supplier_key ?? null };
  const validated = await validateCandidates(candidateList, checks, manufacturerDomain);
  trace.validation = validated;

  // decide threshold: relax threshold slightly for manufacturer domain
  const threshold = manufacturerDomain ? Math.max(0.5, VALIDATION_THRESHOLD - 0.1) : VALIDATION_THRESHOLD;
  trace.threshold = threshold;

  validated.sort((a, b) => b.score - a.score);
  const best = validated[0];
  if (!best || best.score < threshold) {
    trace.final = { ok: false, reason: "low_confidence", topScores: validated.slice(0, 5) };
    return trace;
  }

  trace.final = { ok: true, accepted: best };
  return trace;
}

/**
 * processRow: same production behaviour as before but with improvements:
 * - site-restricted SerpAPI queries first
 * - enhanced validation (JSON-LD/title/h1/token overlap)
 * - site-search attempts
 * - accepts only manufacturer-domain candidates by default (unless ALLOW_RESELLERS)
 */
export async function processRow(row: any) {
  // run trace to compute recommended best candidate
  const trace = await debugRowTrace(row);

  if (!trace.final || !trace.final.ok) {
    // update row unresolved (include candidate list)
    await supabaseAdmin
      .from("match_url_job_rows")
      .update({ candidates: trace.validation ?? [], status: "unresolved", confidence: 0, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return { ok: false, trace };
  }

  const best = trace.final.accepted;
  const resolvedDomain = best.domain ?? hostnameFromUrl(best.url);
  const acceptedCandidate = { url: best.url, domain: resolvedDomain, score: best.score, source: best.source, snippet: best.snippet ?? null };

  await supabaseAdmin
    .from("match_url_job_rows")
    .update({
      candidates: [acceptedCandidate],
      status: "resolved_confident",
      resolved_url: best.url,
      resolved_domain: resolvedDomain,
      confidence: best.score,
      matched_by: "serpapi:manufacturer_strict",
      updated_at: new Date().toISOString()
    })
    .eq("id", row.id);

  // upsert minimal product_source_index (best-effort)
  try {
    const now = new Date().toISOString();
    const payload: any = {
      tenant_id: row.tenant_id,
      supplier_key: row.supplier_key ?? normalizeSupplierKey(row.supplier_name),
      supplier_name: row.supplier_name ?? null,
      sku: row.sku ?? null,
      sku_norm: row.sku_norm ?? null,
      ndc_item_code: row.ndc_item_code ?? null,
      product_name: row.product_name ?? null,
      brand_name: row.brand_name ?? null,
      source_url: best.url,
      source_domain: resolvedDomain,
      confidence: best.score,
      signals: { matched_by: "serpapi:manufacturer_strict" },
      last_seen_at: now,
      updated_at: now,
      created_at: now
    };
    await supabaseAdmin.from("product_source_index").upsert(payload, { onConflict: "tenant_id,supplier_key,sku_norm" });
  } catch (err) {
    console.warn("product_source_index upsert failed:", err);
  }

  return { ok: true, accepted: acceptedCandidate, trace };
}
