// SerpAPI helpers and lightweight page validation used by the matcher
export type SearchResult = { url: string; title?: string; snippet?: string };

const DEFAULT_TIMEOUT = Number(process.env.SEARCH_TIMEOUT_MS ?? 8000);

function timeoutFetch(input: RequestInfo, init: RequestInit = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
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
 * Returns array of { url, title, snippet }.
 */
export async function serpApiSearch(q: string, apiKey?: string, num = 10, timeoutMs = DEFAULT_TIMEOUT): Promise<SearchResult[]> {
  if (!apiKey) return [];
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(q)}&api_key=${encodeURIComponent(apiKey)}&num=${num}`;
  try {
    const res = await timeoutFetch(url, {}, timeoutMs);
    if (!res.ok) throw new Error(`SerpAPI error ${res.status}`);
    const json = await res.json();
    const organic = json.orgic_results ?? json.organic_results ?? json.organic_results ?? [];
    const results: SearchResult[] = (organic || []).map((r: any) => ({
      url: r.link ?? r.url ?? r['displayed_link'] ?? undefined,
      title: r.title ?? r.name ?? undefined,
      snippet: r.snippet ?? r.snippet ?? undefined
    })).filter(Boolean);
    return results;
  } catch (err) {
    console.warn("serpApiSearch error:", err?.message ?? err);
    return [];
  }
}

/**
 * Lightweight page validation: fetch page body and check for presence of sku, ndc, name tokens.
 * Returns { ok, score, matchedTokens, snippet, domain }.
 */
export async function validatePageBasic(url: string, checks: { sku?: string | null; ndc?: string | null; name?: string | null; supplierDomain?: string | null }, timeoutMs = DEFAULT_TIMEOUT) {
  try {
    const res = await timeoutFetch(url, { redirect: "follow" }, timeoutMs);
    if (!res.ok) return { ok: false, error: `status ${res.status}` };
    const text = await res.text();
    const body = text.toLowerCase();
    let score = 0;
    const matchedTokens: string[] = [];

    if (checks.sku) {
      const sku = checks.sku.toLowerCase();
      if (body.includes(sku)) {
        score += 0.7;
        matchedTokens.push(`sku:${checks.sku}`);
      }
    }

    if (checks.ndc) {
      const ndc = checks.ndc.toLowerCase();
      if (body.includes(ndc)) {
        score += 0.6;
        matchedTokens.push(`ndc:${checks.ndc}`);
      }
    }

    if (checks.name) {
      const name = checks.name.toLowerCase().replace(/[^\w\s]/g, " ");
      const tokens = name.split(/\s+/).filter(Boolean);
      if (tokens.length) {
        const matches = tokens.reduce((acc, t) => acc + (body.includes(t) ? 1 : 0), 0);
        const frac = matches / tokens.length;
        score += Math.min(0.5, frac * 0.5);
        if (matches > 0) matchedTokens.push(`name_tokens:${matches}/${tokens.length}`);
      }
    }

    // supplier/domain bonus
    let domain: string | null = null;
    try {
      const u = new URL(url);
      domain = u.hostname.replace(/^www\./, "");
      if (checks.supplierDomain && checks.supplierDomain.toLowerCase().includes(domain)) {
        score += 0.1;
        matchedTokens.push(`domain:${domain}`);
      } else if (checks.supplierDomain && domain.includes(checks.supplierDomain.toLowerCase())) {
        score += 0.08;
        matchedTokens.push(`domain_partial:${domain}`);
      }
    } catch { /* ignore */ }

    // clamp score
    if (score > 1) score = 1;

    const snippet = (body.slice(0, 2000) || "").replace(/\s+/g, " ").slice(0, 2000);
    return { ok: true, score, matchedTokens, snippet, domain };
  } catch (err) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}
