export const SUPPLIER_CONFIG: Record<string, {
  allowDomains?: string[];
  urlPatterns?: Array<{ template: string; key: "skuNorm"|"ndcItemCodeNorm" }>;
  siteSearch?: { baseUrl: string; queryParam: string; resultLinkSelector?: string; };
  webSearchEnabled?: boolean;
}> = {
  mckesson: {
    allowDomains: ["mms.mckesson.com"],
    siteSearch: {
      baseUrl: "https://mms.mckesson.com/catalog",
      queryParam: "query",
    },
    webSearchEnabled: false
  },
  performance_health: {
    allowDomains: ["www.performancehealth.com", "performancehealth.com"],
    siteSearch: { baseUrl: "https://www.performancehealth.com/catalogsearch/result/", queryParam: "q" },
    webSearchEnabled: false
  },

  // Other suppliers can be added here over time.
};
