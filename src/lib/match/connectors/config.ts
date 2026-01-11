export const SUPPLIER_CONFIG: Record<string, {
  allowDomains?: string[];
  urlPatterns?: Array<{ template: string; key: "skuNorm"|"ndcItemCodeNorm" }>;
  siteSearch?: { baseUrl: string; queryParam: string; resultLinkSelector?: string; };
  webSearchEnabled?: boolean;
}> = {
  // Example entry:
  // "acorn": {
  //   allowDomains: ["acorn.example.com"],
  //   urlPatterns: [{ template: "https://acorn.example.com/p/{skuNorm}", key: "skuNorm" }],
  //   siteSearch: { baseUrl: "https://acorn.example.com/search", queryParam: "q" },
  //   webSearchEnabled: false
  // }
};
