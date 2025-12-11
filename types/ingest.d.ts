// types/ingest.d.ts
// Common fields returned by medx-ingest-api. This is intentionally partial — add fields as needed.

export interface DescAudit {
  score?: number;
  passed?: boolean;
  violations?: Array<{ code: string; message: string; severity?: string }>;
  [k: string]: any;
}

export interface IngestResult {
  source?: string;
  name_best?: string;
  short_name_60?: string;
  name_raw?: string;
  description_raw?: string;
  desc_audit?: DescAudit;
  features_html?: string;
  features_structured?: any;
  specs_structured?: any;
  pdf_manual_urls?: string[];
  images?: string[];
  quality_score?: number;
  needs_review?: boolean;
  sections?: any;
  // Allow other fields:
  [k: string]: any;
}
