import type { PricingProfile } from "./types";

/**
 * resolvePricingProfile
 *
 * - Uses DB profile if provided; otherwise default profile.
 * - Allows inline overrides (body.profile can contain enabled/mode/value/etc.)
 */
export function resolvePricingProfile(args: {
  base?: Partial<PricingProfile> | null;
  overrides?: Partial<PricingProfile> | null;
}): PricingProfile {
  const b = args.base ?? {};
  const o = args.overrides ?? {};

  const enabled = o.enabled ?? b.enabled ?? true;
  const mode = (o.mode ?? b.mode ?? "markup") as PricingProfile["mode"];
  const value = Number(o.value ?? b.value ?? 0);

  const rounding = (o.rounding ?? b.rounding ?? "none") as PricingProfile["rounding"];
  const include_shipping_buffer = o.include_shipping_buffer ?? b.include_shipping_buffer ?? false;
  const shipping_buffer = Number(o.shipping_buffer ?? b.shipping_buffer ?? 0);

  const min_price = o.min_price ?? b.min_price ?? null;
  const max_price = o.max_price ?? b.max_price ?? null;
  const min_margin = o.min_margin ?? b.min_margin ?? null;

  return {
    enabled: Boolean(enabled),
    mode,
    value: Number.isFinite(value) ? value : 0,
    rounding,
    include_shipping_buffer: Boolean(include_shipping_buffer),
    shipping_buffer: Number.isFinite(shipping_buffer) ? shipping_buffer : 0,
    min_price: min_price == null ? null : Number(min_price),
    max_price: max_price == null ? null : Number(max_price),
    min_margin: min_margin == null ? null : Number(min_margin),
  };
}
