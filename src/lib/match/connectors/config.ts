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

  // Other suppliers can be added here over time.
};
