export type DescribeFormat =
  | "avidia_standard"
  | "shopify"
  | "technical"
  | "ecommerce"
  | "lifestyle";

export interface DescribeRequest {
  name: string;
  shortDescription: string;
  brand?: string;
  specs?: Record<string, string>;
  format?: DescribeFormat;
}

export interface SeoFields {
  h1?: string;
  pageTitle?: string;
  metaDescription?: string;
  seoShortDescription?: string;
}

export interface DescribeSections {
  overview?: string;
  features?: string[];
  specsSummary?: Record<string, any>;
  includedItems?: string[];
  manualsSectionHtml?: string;
}

export interface DescribeResponse {
  descriptionHtml?: string;
  sections?: DescribeSections;
  seo?: SeoFields;
  raw?: any;
  normalizedPayload?: any;
}
