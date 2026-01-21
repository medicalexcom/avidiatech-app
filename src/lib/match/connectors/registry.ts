import { SupplierConnector, ResolveInput, ConnectorResult, CandidateUrl } from "./types";
import { SUPPLIER_CONFIG } from "./config";
import { domainOf, isSafePublicUrl } from "../netSafety";
import { fetchWithTimeout } from "../http";
import { extractLinksFromHtml, keepSameHost } from "../htmlExtract";

const registry: Record<string, SupplierConnector> = {};

/** Generic connector: pattern + site search (very conservative) */
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
          cand.push({ url, domain: domainOf(url) || "", method: "pattern", confidence: 0.5, reasons: ["pattern"] });
        }
      }

      // 2) site search (implemented)
      if (cfg.siteSearch) {
        const q = (input.skuNorm || input.sku || input.ndcItemCodeNorm || input.ndcItemCode || input.productNameNorm || input.productName || "").toString().trim();
        if (q) {
          const searchUrl = new URL(cfg.siteSearch.baseUrl);
          searchUrl.searchParams.set(cfg.siteSearch.queryParam, q);

          try {
            const resp = await fetchWithTimeout(searchUrl.toString(), { timeoutMs: 12_000 });
            const html = resp?.text ?? "";
            let links = extractLinksFromHtml(html, searchUrl.toString());

            // stay on same host as searchUrl (prevents picking up external links)
            links = keepSameHost(links, searchUrl.toString());

            // filter safe and (if allowDomains configured) keep only allowlisted domains
            const allowDomains = (cfg.allowDomains ?? []).map((d) => d.toLowerCase());
            links = links
              .filter((u) => isSafePublicUrl(u))
              .filter((u) => {
                if (!allowDomains.length) return true;
                return allowDomains.includes(domainOf(u).toLowerCase());
              });

            // McKesson-specific: prefer product pages
            // (Still safe for other suppliers because it only boosts/filters candidates)
            const productLinks = links.filter((u) => /\/product\/\d+\//i.test(u));
            const chosen = productLinks.length ? productLinks : links;

            for (const u of uniq(chosen).slice(0, 10)) {
              cand.push({ url: u, domain: domainOf(u) || "", method: "siteSearch", confidence: 0.45, reasons: ["site_search"] });
            }
          } catch (err: any) {
            // swallow; return whatever we have
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
