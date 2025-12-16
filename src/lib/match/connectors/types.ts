export type ResolveInput = {
  tenantId: string;
  supplierName?: string | null;
  supplierKey: string;
  sku?: string | null;
  skuNorm?: string | null;
  ndcItemCode?: string | null;
  ndcItemCodeNorm?: string | null;
  productName?: string | null;
  productNameNorm?: string | null;
  brandName?: string | null;
};

export type CandidateUrl = {
  url: string;
  domain: string;
  method: "pattern" | "site_search" | "api" | "web_search" | "other";
  confidence: number;
  reasons: string[];
};

export type ConnectorResult = {
  candidates: CandidateUrl[];
  debug?: any;
};

export interface SupplierConnector {
  key: string;
  displayName: string;
  resolveCandidates(input: ResolveInput): Promise<ConnectorResult>;
}
