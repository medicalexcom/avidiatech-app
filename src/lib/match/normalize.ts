// src/lib/match/normalizeAndParse.ts
import { parse as csvParse } from "csv-parse/sync";

/**
 * Normalizers
 */
export function normalizeKey(s?: string | null): string {
  if (!s) return "";
  return s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\u00A0\u2000-\u200B]+/g, " ")
    .replace(/[^\w\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSupplierName(name?: string | null) {
  return normalizeKey(name);
}

export function normalizeSku(sku?: string | null) {
  if (!sku) return "";
  // keep letters, digits, - _
  return sku.toString().trim().toLowerCase().replace(/[^a-z0-9\-_]/g, "");
}

export function normalizeNdcItemCode(code?: string | null) {
  if (!code) return "";
  return code.toString().trim().replace(/\s+/g, "").toUpperCase();
}

export function normalizeProductName(name?: string | null) {
  if (!name) return "";
  return name
    .toString()
    .replace(/[®™]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * parsePasteOrCsv
 * - Accepts multiline CSV or plain "sku,brand,gtin" per line paste.
 * - Returns { items, warnings } where items are normalized and deduped.
 *
 * Notes:
 * - sku is normalized via normalizeSku
 * - brand is normalized via normalizeKey (keeps readable words)
 * - gtin is trimmed as-is (optionally you can normalize to digits-only if you want)
 */
export function parsePasteOrCsv(input: string) {
  input = (input || "").toString().trim();
  if (!input) return { items: [], warnings: [] as string[] };

  let records: string[][] = [];
  try {
    records = csvParse(input, {
      trim: true,
      skip_empty_lines: true,
    }) as string[][];
  } catch {
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
    const rawSku = (row[0] || "").toString().trim();
    if (!rawSku) {
      warnings.push("empty-sku-row");
      continue;
    }

    const sku = normalizeSku(rawSku);
    if (!sku) {
      warnings.push(`invalid-sku:${rawSku}`);
      continue;
    }

    const rawBrand = (row[1] || "").toString().trim();
    const brand = rawBrand ? normalizeKey(rawBrand) || undefined : undefined;

    const rawGtin = (row[2] || "").toString().trim();
    const gtin = rawGtin || undefined;

    const key = `${sku}|${brand || ""}|${gtin || ""}`;
    if (seen.has(key)) {
      warnings.push(`duplicate:${sku}`);
      continue;
    }

    seen.add(key);
    items.push({ sku, brand, gtin });
  }

  return { items, warnings };
}
