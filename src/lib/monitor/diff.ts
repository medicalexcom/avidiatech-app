import type { MonitorSnapshot } from "./snapshot";

export type ChangeType = "price" | "seo" | "specs" | "manuals" | "images" | "variants";

export type DiffResult = {
  changed: boolean;
  changeTypes: ChangeType[];
  severity: "info" | "warning" | "critical";
  summary: string;
  diff: any;
  suggestedAction: "none" | "seo_only" | "full";
};

function pctDelta(oldV: number, newV: number): number {
  if (!oldV) return 100;
  return Math.abs(newV - oldV) / Math.abs(oldV) * 100;
}

function setEq(a: string[], b: string[]) {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

export function diffSnapshots(params: {
  before: MonitorSnapshot | null;
  after: MonitorSnapshot;
  policy?: any;
}): DiffResult {
  const before = params.before;
  const after = params.after;

  if (!before) {
    return {
      changed: true,
      changeTypes: ["seo", "price", "specs", "manuals", "images", "variants"],
      severity: "info",
      summary: "Initial snapshot captured",
      diff: { before: null, after },
      suggestedAction: "none",
    };
  }

  const policy = params.policy ?? {};
  const thresholds = policy?.thresholds ?? {};
  const priceThresholdPct = Number(thresholds.price_delta_pct ?? 2);
  const specChangeMin = Number(thresholds.spec_change_min ?? 1);

  const changeTypes: ChangeType[] = [];
  const diff: any = { before: {}, after: {}, deltas: {} };

  // SEO
  const seoBefore = before.seo ?? {};
  const seoAfter = after.seo ?? {};
  const seoChanged =
    (seoBefore.h1 ?? null) !== (seoAfter.h1 ?? null) ||
    (seoBefore.title ?? null) !== (seoAfter.title ?? null) ||
    (seoBefore.meta_description ?? null) !== (seoAfter.meta_description ?? null) ||
    (seoBefore.canonical ?? null) !== (seoAfter.canonical ?? null);

  if (seoChanged) {
    changeTypes.push("seo");
    diff.before.seo = seoBefore;
    diff.after.seo = seoAfter;
  }

  // Price
  const pb = before.price;
  const pa = after.price;
  let priceChanged = false;
  let priceDeltaPct: number | null = null;
  if (pb?.value != null && pa?.value != null) {
    priceDeltaPct = pctDelta(pb.value, pa.value);
    if (priceDeltaPct >= priceThresholdPct) priceChanged = true;
  } else if ((pb?.value == null) !== (pa?.value == null)) {
    priceChanged = true;
  }
  if (priceChanged) {
    changeTypes.push("price");
    diff.before.price = pb;
    diff.after.price = pa;
    diff.deltas.price = { delta_pct: priceDeltaPct };
  }

  // Specs
  const bKeys = Object.keys(before.specs ?? {});
  const aKeys = Object.keys(after.specs ?? {});
  const added = aKeys.filter((k) => !(k in (before.specs ?? {})));
  const removed = bKeys.filter((k) => !(k in (after.specs ?? {})));
  const changedVals = aKeys.filter((k) => (k in (before.specs ?? {})) && (before.specs[k] !== after.specs[k]));

  const specChangeCount = added.length + removed.length + changedVals.length;
  if (specChangeCount >= specChangeMin && specChangeCount > 0) {
    changeTypes.push("specs");
    diff.deltas.specs = { added, removed, changed: changedVals };
  }

  // Manuals
  const bm = (before.manuals ?? []).map((m) => m.url).filter(Boolean);
  const am = (after.manuals ?? []).map((m) => m.url).filter(Boolean);
  if (!setEq(bm, am)) {
    changeTypes.push("manuals");
    diff.deltas.manuals = {
      added: am.filter((u) => !bm.includes(u)),
      removed: bm.filter((u) => !am.includes(u)),
    };
  }

  // Images
  const bi = (before.images ?? []).map((i) => i.url).filter(Boolean);
  const ai = (after.images ?? []).map((i) => i.url).filter(Boolean);
  if (!setEq(bi, ai)) {
    changeTypes.push("images");
    diff.deltas.images = {
      primary_before: bi[0] ?? null,
      primary_after: ai[0] ?? null,
      added: ai.filter((u) => !bi.includes(u)),
      removed: bi.filter((u) => !ai.includes(u)),
    };
  }

  // Variants (minimal signal)
  const bVarCount = (before.variants?.children ?? []).length;
  const aVarCount = (after.variants?.children ?? []).length;
  if (bVarCount !== aVarCount) {
    changeTypes.push("variants");
    diff.deltas.variants = { children_count_before: bVarCount, children_count_after: aVarCount };
  }

  const changed = changeTypes.length > 0;

  // Severity rules
  let severity: DiffResult["severity"] = changed ? "info" : "info";
  if (changeTypes.includes("manuals") || changeTypes.includes("images") || changeTypes.includes("specs") || changeTypes.includes("variants")) {
    severity = "warning";
  }
  if (changeTypes.includes("price")) {
    if (priceDeltaPct != null) {
      if (priceDeltaPct >= 25) severity = "critical";
      else if (priceDeltaPct >= 10) severity = severity === "critical" ? "critical" : "warning";
      else severity = severity === "warning" ? "warning" : "info";
    } else {
      // missing suddenly
      severity = "warning";
    }
  }

  // Suggested action
  let suggestedAction: DiffResult["suggestedAction"] = "none";
  const hasFull = changeTypes.some((t) => ["specs", "manuals", "images", "variants"].includes(t));
  if (hasFull) suggestedAction = "full";
  else if (changeTypes.length === 1 && changeTypes[0] === "seo") suggestedAction = "seo_only";
  else if (changeTypes.includes("seo")) suggestedAction = "seo_only";

  const summaryParts: string[] = [];
  if (changeTypes.includes("price")) summaryParts.push("Price changed");
  if (changeTypes.includes("seo")) summaryParts.push("SEO fields changed");
  if (changeTypes.includes("specs")) summaryParts.push("Specs changed");
  if (changeTypes.includes("manuals")) summaryParts.push("Manuals changed");
  if (changeTypes.includes("images")) summaryParts.push("Images changed");
  if (changeTypes.includes("variants")) summaryParts.push("Variants changed");

  const summary = changed ? summaryParts.join(" · ") : "No changes";

  return { changed, changeTypes, severity, summary, diff: { ...diff, before, after }, suggestedAction };
}
