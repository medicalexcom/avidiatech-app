import { parse as csvParse } from "csv-parse/sync";

/**
 * parsePasteOrCsv
 * - Accepts multiline CSV or plain "sku,brand,gtin" per line paste.
 * - Returns { items, warnings } where items are normalized and deduped.
 */
export function parsePasteOrCsv(input: string) {
  input = (input || "").toString().trim();
  if (!input) return { items: [], warnings: [] as string[] };

  let records: string[][] = [];
  try {
    records = csvParse(input, {
      trim: true,
      skip_empty_lines: true
    }) as string[][];
  } catch (e) {
    // fallback: newline + split on comma
    records = input
      .split(/\r?\n/)
      .map((l) => l.split(",").map((c) => c.trim()))
      .filter((r) => r.length > 0 && r[0]);
  }

  const seen = new Set<string>();
  const items: { sku: string; brand?: string; gtin?: string }[] = [];
  const warnings: string[] = [];

  for (const row of records) {
    const sku = (row[0] || "").toString().trim();
    if (!sku) {
      warnings.push("empty-sku-row");
      continue;
    }
    const brand = (row[1] || "").toString().trim() || undefined;
    const gtin = (row[2] || "").toString().trim() || undefined;
    const key = `${sku}|${(brand || "").toLowerCase()}|${gtin || ""}`;
    if (seen.has(key)) {
      warnings.push(`duplicate:${sku}`);
      continue;
    }
    seen.add(key);
    items.push({ sku, brand, gtin });
  }

  return { items, warnings };
}
