export function scoreCandidate(opts: {
  brandHint?: string;
  pageBrand?: string;
  sku: string;
  pageContainsSku?: boolean;
  titleSimilarity?: number; // 0..1
  patternBase: number; // 0..1
}) {
  let s = typeof opts.patternBase === "number" ? opts.patternBase : 0;
  if (opts.pageContainsSku) s += 0.25;
  if (opts.brandHint && opts.pageBrand && opts.brandHint.toLowerCase() === opts.pageBrand.toLowerCase()) s += 0.15;
  if (typeof opts.titleSimilarity === "number") s += Math.max(0, Math.min(0.3, opts.titleSimilarity * 0.3));
  return Math.max(0, Math.min(1, s));
}
