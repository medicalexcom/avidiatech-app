import { SupplierConnector, ResolveInput, ConnectorResult, CandidateUrl } from "./types";
import { SUPPLIER_CONFIG } from "./config";
import { domainOf } from "../match/netSafety";

const registry: Record<string, SupplierConnector> = {};

/** Generic connector: pattern + site search (very conservative) */
class GenericConnector implements SupplierConnector {
  key = "generic";
  displayName = "Generic connector (no-op)";

  async resolveCandidates(_input: ResolveInput): Promise<ConnectorResult> {
    return { candidates: [] };
  }
}

export function getConnector(supplierKey: string): SupplierConnector {
  if (!supplierKey) return new GenericConnector();
  const lower = supplierKey.toString().toLowerCase();
  if (registry[lower]) return registry[lower];
  // create a simple connector based on SUPPLIER_CONFIG if present
  const cfg = SUPPLIER_CONFIG[lower];
  if (!cfg) return new GenericConnector();

  // pattern connector
  const connector: SupplierConnector = {
    key: lower,
    displayName: `Connector for ${lower}`,
    async resolveCandidates(input: ResolveInput) {
      const cand: CandidateUrl[] = [];
      if (cfg.urlPatterns) {
        for (const p of cfg.urlPatterns) {
          const val = (p.key === "skuNorm" ? input.skuNorm : input.ndcItemCodeNorm) ?? "";
          if (!val) continue;
          const url = p.template.replace(`{${p.key}}`, encodeURIComponent(val));
          cand.push({ url, domain: domainOf(url) || "", method: "pattern", confidence: 0.5, reasons: ["pattern"] });
        }
      }
      // siteSearch not implemented fully here -> placeholder (no network calls in registry)
      return { candidates: cand, debug: { cfg } };
    }
  };
  registry[lower] = connector;
  return connector;
}
