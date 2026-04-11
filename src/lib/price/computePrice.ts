import type { PricingComputation, PricingComputeInput, PricingProfile } from "./types";
import { applyRounding } from "./rounding";

function n(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.trim().replace(/^\$/, "");
    if (!s) return null;
    const f = Number.parseFloat(s);
    if (Number.isFinite(f)) return f;
  }
  return null;
}

function clampMinMax(price: number, min?: number | null, max?: number | null) {
  let p = price;
  const capsApplied: string[] = [];
  if (typeof min === "number" && Number.isFinite(min) && p < min) {
    p = min;
    capsApplied.push("min_price");
  }
  if (typeof max === "number" && Number.isFinite(max) && p > max) {
    p = max;
    capsApplied.push("max_price");
  }
  return { price: p, capsApplied };
}

/**
 * computePrice (authoritative server-side computation)
 *
 * - If profile.enabled and cost missing => blocked
 * - base = cost + shipping_buffer (if enabled)
 * - markup: base * (1 + value)
 * - margin: base / (1 - value)
 * - enforce min_margin if present
 * - apply min/max caps
 * - apply rounding
 */
export function computePrice(args: {
  input: PricingComputeInput;
  profile: PricingProfile;
}): PricingComputation {
  const currency = (args.input.currency || "USD").toString();
  const profile = args.profile;

  const warnings: string[] = [];
  const capsApplied: string[] = [];

  const cost = n(args.input.cost);

  if (profile.enabled && (cost == null || !Number.isFinite(cost))) {
    return {
      result: {
        computedPrice: null,
        storePrice: null,
        currency,
        rounding: profile.rounding,
        capsApplied: [],
        blocked: true,
        blockReason: "missing_cost",
        warnings: [],
      },
      explain: "Blocked: missing cost input.",
    };
  }

  // If profile disabled: we still return blocked=true to prevent accidental pushes,
  // but UI can treat it as "manual pricing required".
  if (!profile.enabled) {
    return {
      result: {
        computedPrice: null,
        storePrice: null,
        currency,
        rounding: profile.rounding,
        capsApplied: [],
        blocked: true,
        blockReason: "profile_disabled",
        warnings: [],
      },
      explain: "Blocked: pricing profile disabled.",
    };
  }

  const bufferEnabled = Boolean(profile.include_shipping_buffer);
  const buffer = bufferEnabled ? n(profile.shipping_buffer) ?? 0 : 0;

  if (bufferEnabled && buffer < 0) warnings.push("shipping_buffer_negative");

  const base = (cost ?? 0) + buffer;

  if (base <= 0) warnings.push("base_cost_non_positive");

  const mode = profile.mode;
  const value = Number(profile.value ?? 0);
  if (!Number.isFinite(value)) warnings.push("invalid_profile_value");

  let candidate = base;

  if (mode === "markup") {
    candidate = base * (1 + value);
  } else if (mode === "margin") {
    const denom = 1 - value;
    if (denom <= 0) {
      return {
        result: {
          computedPrice: null,
          storePrice: null,
          currency,
          rounding: profile.rounding,
          capsApplied: [],
          blocked: true,
          blockReason: "invalid_margin_value",
          warnings: ["margin_value_must_be_less_than_1"],
        },
        explain: `Blocked: invalid margin value (${value}).`,
      };
    }
    candidate = base / denom;
  }

  if (!Number.isFinite(candidate)) {
    return {
      result: {
        computedPrice: null,
        storePrice: null,
        currency,
        rounding: profile.rounding,
        capsApplied: [],
        blocked: true,
        blockReason: "non_finite_candidate",
        warnings: ["candidate_not_finite"],
      },
      explain: "Blocked: computed candidate price is not finite.",
    };
  }

  // Enforce min_margin if present (margin computed as (price - cost)/price)
  let afterMargin = candidate;
  if (profile.min_margin != null) {
    const minMargin = Number(profile.min_margin);
    if (Number.isFinite(minMargin) && minMargin > 0) {
      const denom = 1 - minMargin;
      if (denom <= 0) {
        warnings.push("invalid_min_margin_value");
      } else {
        const floorPrice = (cost ?? 0) / denom;
        if (afterMargin < floorPrice) {
          afterMargin = floorPrice;
          capsApplied.push("min_margin");
        }
      }
    }
  }

  // Apply min/max caps BEFORE rounding
  const capped = clampMinMax(afterMargin, profile.min_price ?? null, profile.max_price ?? null);
  capsApplied.push(...capped.capsApplied);

  // Apply rounding
  const rounded = applyRounding(capped.price, profile.rounding);

  // Validate final store price
  const storePrice = rounded;

  let blocked = false;
  let blockReason: string | null = null;

  if (!Number.isFinite(storePrice)) {
    blocked = true;
    blockReason = "store_price_not_finite";
  } else if (storePrice <= 0) {
    blocked = true;
    blockReason = "store_price_non_positive";
  }

  const explain = [
    `base=(${cost ?? "?"}${bufferEnabled ? `+${buffer}` : ""})=${base.toFixed(4)}`,
    `${mode}(${value}) => ${candidate.toFixed(4)}`,
    `after_margin => ${afterMargin.toFixed(4)}`,
    `caps(${(profile.min_price ?? "") || "-"},${(profile.max_price ?? "") || "-"}) => ${capped.price.toFixed(4)}`,
    `round(${profile.rounding}) => ${storePrice.toFixed(2)}`,
  ].join(" -> ");

  return {
    result: {
      computedPrice: candidate,
      storePrice,
      currency,
      rounding: profile.rounding,
      capsApplied,
      blocked,
      blockReason,
      warnings,
    },
    explain,
  };
}
