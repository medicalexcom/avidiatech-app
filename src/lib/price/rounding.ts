export function roundToNearestIncrement(value: number, increment: number) {
  if (!Number.isFinite(value)) return value;
  if (!Number.isFinite(increment) || increment <= 0) return value;
  return Math.round(value / increment) * increment;
}

export function roundEnds99(value: number) {
  if (!Number.isFinite(value)) return value;

  // Basic behavior: go to the nearest *below* integer and add 0.99.
  // If value is already an exact integer, we still return (integer - 1 + 0.99) which is undesirable.
  // So we treat integer as "keep same integer + 0.99".
  const intPart = Math.floor(value);
  const isInt = Math.abs(value - intPart) < 1e-9;

  const base = isInt ? intPart : intPart; // keep
  const out = base + 0.99;

  // Ensure we don't accidentally round down below 0
  return out < 0 ? 0 : out;
}

export function applyRounding(value: number, rounding: "none" | "nearest_0_05" | "nearest_0_10" | "ends_99") {
  switch (rounding) {
    case "nearest_0_05":
      return roundToNearestIncrement(value, 0.05);
    case "nearest_0_10":
      return roundToNearestIncrement(value, 0.1);
    case "ends_99":
      return roundEnds99(value);
    case "none":
    default:
      return value;
  }
}
