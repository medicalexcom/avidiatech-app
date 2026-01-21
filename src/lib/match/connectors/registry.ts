import { SupplierConnector, ResolveInput, ConnectorResult, CandidateUrl } from "./types";
import { SUPPLIER_CONFIG } from "./config";
import { domainOf, isSafePublicUrl } from "../netSafety";
import { fetchWithTimeout } from "../http";
import { extractLinksFromHtml, keepSameHost } from "../htmlExtract";
import { applyPathRules, canonicalizeUrl, pathLooksLikeDownload } from "../url";

const registry: Record<string, SupplierConnector> = {};

/** Generic connector: no candidates by default */
class GenericConnector implements SupplierConnector {
  key = "generic";
  displayName = "Generic connector (no-op)";

  async resolveCandidates(_input: ResolveInput): Promise<ConnectorResult> {
    return { candidates: [] };
  }
}

function uniq(urls: string[]) {
  const seen = new Set<string>();
  return urls.filter((u) => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });
}

export function getConnector(supplierKey: string): SupplierConnector {
  if (!supplierKey) return new GenericConnector();
  const lower = supplierKey.toString().toLowerCase();
  if (registry[lower]) return registry[lower];

  const cfg = SUPPLIER_CONFIG[lower];
  if (!cfg) return new GenericConnector();

  const connector: SupplierConnector = {
    key: lower,
    displayName: `Connector for ${lower}`,
    async resolveCandidates(input: ResolveInput) {
      const cand: CandidateUrl[] = [];

      // 1) deterministic patterns
      if (cfg.urlPatterns) {
        for (const p of cfg.urlPatterns) {
          const val = (p.key === "skuNorm" ? input.skuNorm : input.ndcItemCodeNorm) ?? "";
          if (!val) continue;
          const url = p.template.replace(`{${p.key}}`, encodeURIComponent(val));
          const canon = canonicalizeUrl(url);
          if (!isSafePublicUrl(canon)) continue;
          if (!applyPathRules(canon, cfg)) continue;
          cand.push({ url: canon, domain: domainOf(canon) || "", method: "pattern", confidence: 0.5, reasons: ["pattern"] });
        }
      }

      // 2) site search
      if (cfg.siteSearch) {
        const q = (input.skuNorm || input.sku || input.ndcItemCodeNorm || input.ndcItemCode || input.productNameNorm || input.productName || "").toString().trim();
        if (q) {
          const searchUrl = new URL(cfg.siteSearch.baseUrl);
          searchUrl.searchParams.set(cfg.siteSearch.queryParam, q);

          try {
            const resp = await fetchWithTimeout(searchUrl.toString(), { timeoutMs: 12_000 });
            const html = resp?.text ?? "";

            // Extract links from HTML and keep same host as search page.
            let links = extractLinksFromHtml(html, searchUrl.toString());
            links = keepSameHost(links, searchUrl.toString());

            // Canonicalize and basic safety filter
            links = links
              .map((u) => {
                try {
                  return canonicalizeUrl(u);
                } catch {
                  return "";
                }
              })
              .filter(Boolean)
              .filter((u) => isSafePublicUrl(u));

            // Domain allowlist (if configured)
            const allowDomains = (cfg.allowDomains ?? []).map((d) => d.toLowerCase());
            if (allowDomains.length) {
              links = links.filter((u) => allowDomains.includes(domainOf(u).toLowerCase()));
            }

            // Hard drop obvious downloads regardless of supplier (helps PH a lot)
            links = links.filter((u) => {
              try {
                return !pathLooksLikeDownload(new URL(u).pathname);
              } catch {
                return false;
              }
            });

            // Apply supplier path rules if present (deny + allow regex)
            links = links.filter((u) => applyPathRules(u, cfg));

            // McKesson-specific preference: product pages
            if (lower === "mckesson") {
              const productLinks = links.filter((u) => /\/product\/\d+\//i.test(u));
              if (productLinks.length) links = productLinks.concat(links);
            }

            const final = uniq(links).slice(0, 10);
            for (const u of final) {
              cand.push({
                url: u,
                domain: domainOf(u) || "",
                method: "site_search",
                confidence: 0.45,
                reasons: ["site_search"]
              });
            }
          } catch (err: any) {
            return { candidates: cand, debug: { siteSearchError: String(err?.message ?? err) } };
          }
        }
      }

      return { candidates: cand, debug: { cfg } };
    }
  };

  registry[lower] = connector;
  return connector;
}
