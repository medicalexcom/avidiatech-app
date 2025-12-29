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
  title?: string; // some generators use title
  metaDescription?: string;
  keywords?: string[] | string; // new: search keywords
  seoShortDescription?: string;
}

export interface DescribeSections {
  // Overview should be full HTML canvas (we’ll render descriptionHtml there)
  overview?: string;

  // New: sections you want as HTML
  hook?: string;
  mainDescription?: string;
  featuresBenefits?: string;
  specifications?: string;
  internalLinks?: string;
  whyChoose?: string;
  manuals?: string;
  faqs?: string;

  // Keep old fields for backward compatibility
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
