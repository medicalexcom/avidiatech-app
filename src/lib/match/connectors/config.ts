export const SUPPLIER_CONFIG: Record<string, {
  allowDomains?: string[];
  urlPatterns?: Array<{ template: string; key: "skuNorm"|"ndcItemCodeNorm" }>;
  siteSearch?: { baseUrl: string; queryParam: string; resultLinkSelector?: string; };
  webSearchEnabled?: boolean;

  /**
   * Optional candidate URL filtering rules.
   * Applied AFTER URL extraction and domain allowlisting.
   */
  denyPathPrefixes?: string[];
  allowPathRegex?: string; // JS regex string, e.g. "^/[^/?#]+/?$"
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
    siteSearch: {
      baseUrl: "https://www.performancehealth.com/catalogsearch/result/",
      queryParam: "q",
    },
    webSearchEnabled: false,

    // Performance Health has many non-product routes; we want to avoid these.
    denyPathPrefixes: [
      "/amfile/",
      "/catalogsearch/",
      "/customer/",
      "/checkout/",
      "/cart",
      "/products", // listing
      "/search",   // sometimes used by other sites; harmless here
    ],

    // Prefer "slug" product pages like "/comfortrac-cervical"
    // This intentionally excludes multi-segment paths (tune later if needed).
    allowPathRegex: "^/[^/?#]+/?$"
  },

  // Other suppliers can be added here over time.
};
