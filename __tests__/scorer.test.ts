import { scoreCandidate } from "@/lib/match/scorer";

describe("scorer", () => {
  it("bounds score to 0..1", () => {
    const s = scoreCandidate({ sku: "X", patternBase: 1, pageContainsSku: true, titleSimilarity: 1, brandHint: "A", pageBrand: "A" });
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it("adds brand match weight", () => {
    const a = scoreCandidate({ sku: "S", patternBase: 0.4, pageContainsSku: false, titleSimilarity: 0, brandHint: "Acme", pageBrand: "Acme" });
    const b = scoreCandidate({ sku: "S", patternBase: 0.4, pageContainsSku: false, titleSimilarity: 0, brandHint: "Acme", pageBrand: "Other" });
    expect(a).toBeGreaterThan(b);
  });
});
