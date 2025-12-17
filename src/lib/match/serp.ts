// SerpAPI helpers and enhanced page validation used by the matcher
export type SearchResult = { url: string; title?: string; snippet?: string };

const DEFAULT_TIMEOUT = Number(process.env.SEARCH_TIMEOUT_MS ?? 8000);

export function timeoutFetch(input: RequestInfo, init: RequestInit = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  // @ts-ignore - Node native fetch supports signal in newer runtimes; keep as-is for serverless environments
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(id));
}

export function hostnameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Query SerpAPI for results.
 */
export async function serpApiSearch(q: string, apiKey?: string, num = 10, timeoutMs = DEFAULT_TIMEOUT): Promise<SearchResult[]> {
  if (!apiKey) return [];
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(q)}&api_key=${encodeURIComponent(apiKey)}&num=${num}`;
  try {
    const res = await timeoutFetch(url, {}, timeoutMs);
    if (!res.ok) throw new Error(`SerpAPI error ${res.status}`);
    const json = await res.json();
    const organic = (json.organic_results ?? json.orgic_results ?? []) as any[];
    const results: SearchResult[] = (organic || []).map((r: any) => ({
      url: r.link ?? r.url ?? r['displayed_link'],
      title: r.title ?? r.name,
      snippet: r.snippet ?? r.snippet
    })).filter((x) => !!x.url);
    return results;
  } catch (err: any) {
    console.warn("serpApiSearch error:", String(err?.message ?? err));
    return [];
  }
}

/**
 * Compute simple token overlap ratio between two strings (0..1)
 */
export function tokenOverlapScore(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0;
  const ta = a.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
  const tb = b.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
  if (!ta.length || !tb.length) return 0;
  const setB = new Set(tb);
  const matches = ta.reduce((acc, t) => acc + (setB.has(t) ? 1 : 0), 0);
  return matches / Math.max(ta.length, tb.length);
}

/**
 * Enhanced page validation:
 * - Parses JSON-LD <script type="application/ld+json"> Product blocks
 * - Checks <title>, first <h1>
 * - Performs sku/ndc substring match and token overlap scoring
 * - Returns score (0..1) and matched tokens/details
 */
export async function validatePageBasic(url: string, checks: { sku?: string | null; ndc?: string | null; name?: string | null; supplierDomain?: string | null }, timeoutMs = DEFAULT_TIMEOUT) {
  try {
    const res = await timeoutFetch(url, { redirect: "follow" }, timeoutMs);
    if (!res.ok) return { ok: false, error: `status ${res.status}` };
    const html = await res.text();
    const lc = html.toLowerCase();

    let score = 0;
    const matchedTokens: string[] = [];

    // 1) JSON-LD: find <script type="application/ld+json"> blocks and parse
    try {
      const ldRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      const ldMatches = [...html.matchAll(ldRegex)];
      for (const m of ldMatches) {
        try {
          const obj = JSON.parse(m[1]);
          const items = Array.isArray(obj) ? obj : [obj];
          for (const item of items) {
            // safer access for @type / type
            const t = String(item?.["@type"] ?? item?.type ?? "").toLowerCase();
            if (t.includes("product") || item?.name || item?.sku) {
              if (checks.sku && item?.sku && String(item.sku).toLowerCase().includes(checks.sku.toLowerCase())) {
                score += 0.8;
                matchedTokens.push("jsonld.sku");
              }
              if (checks.name && item?.name) {
                const ov = tokenOverlapScore(checks.name, String(item.name));
                if (ov > 0) { score += Math.min(0.6, ov * 0.6); matchedTokens.push(`jsonld.name:${ov.toFixed(2)}`); }
              }
            }
          }
        } catch {
          // ignore JSON parse errors
        }
      }
    } catch {
      // ignore
    }

    // 2) title and first h1
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : "";
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const h1 = h1Match ? h1Match[1] : "";

    // SKU / NDC substring in body
    if (checks.sku && lc.includes(checks.sku.toLowerCase())) { score += 0.6; matchedTokens.push("body.sku"); }
    if (checks.ndc && lc.includes(checks.ndc.toLowerCase())) { score += 0.6; matchedTokens.push("body.ndc"); }

    // token overlap with title/h1
    const titleOv = tokenOverlapScore(checks.name, title);
    if (titleOv > 0) { score += Math.min(0.5, titleOv * 0.6); matchedTokens.push(`title:${titleOv.toFixed(2)}`); }

    const h1Ov = tokenOverlapScore(checks.name, h1);
    if (h1Ov > 0) { score += Math.min(0.6, h1Ov * 0.6); matchedTokens.push(`h1:${h1Ov.toFixed(2)}`); }

    // supplier/domain bonus
    let domain: string | null = null;
    try {
      const u = new URL(url);
      domain = u.hostname.replace(/^www\./, "");
      if (checks.supplierDomain && domain.includes(checks.supplierDomain)) {
        score += 0.12;
        matchedTokens.push("domain.match");
      }
    } catch { /* ignore */ }

    if (score > 1) score = 1;
    const snippet = (lc.slice(0, 2000) || "").replace(/\s+/g, " ").slice(0, 2000);
    return { ok: true, score, matchedTokens, snippet, domain };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}
