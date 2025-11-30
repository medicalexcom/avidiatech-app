export type MatchInput = { sku: string; brand?: string; gtin?: string };
export type MatchJobRequest = { items: MatchInput[] };

export type MatchRow = {
  id: string;
  sku: string;
  brand_hint?: string | null;
  gtin?: string | null;
  candidate_url?: string | null;
  domain?: string | null;
  source: "pattern" | "search" | "manual";
  confidence: number;
  status: "candidate" | "confirmed" | "rejected" | "failed";
  verify_checks?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};
