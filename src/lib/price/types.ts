export type PricingMode = "monitor" | "suggest" | "auto";

export type PricingProfile = {
  enabled: boolean;
  mode: "markup" | "margin";
  value: number; // decimals: 0.25, 0.22 etc.
  rounding: "none" | "nearest_0_05" | "nearest_0_10" | "ends_99";
  include_shipping_buffer?: boolean;
  shipping_buffer?: number;
  min_price?: number | null;
  max_price?: number | null;
  min_margin?: number | null; // decimal: 0.2 => 20%
};

export type PricingComputeInput = {
  cost?: number | null;
  currency?: string | null; // stored for explainability
};

export type PricingResult = {
  computedPrice: number | null;
  storePrice: number | null;
  currency: string;
  rounding: PricingProfile["rounding"];
  capsApplied: string[];
  blocked: boolean;
  blockReason?: string | null;
  warnings: string[];
};

export type PricingComputation = {
  result: PricingResult;
  explain: string;
};
