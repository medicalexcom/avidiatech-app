// src/lib/bulk/parse.ts
// Simple CSV/paste parser to accept lines like:
// url,price
// url
//
// Returns array of { input_url, metadata } where metadata may include price.

export type BulkInputItem = {
  input_url: string;
  metadata?: Record<string, any>;
  idempotency_key?: string;
};

export function parsePastedUrls(text: string): BulkInputItem[] {
  if (!text) return [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const out: BulkInputItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    // Allow CSV-like with comma separated url,price,... (price optional)
    // Also allow tab-separated
    const parts = raw.split(/[,|\t]/).map((p) => p.trim()).filter(Boolean);
    const url = parts[0];
    if (!url) continue;
    const item: BulkInputItem = { input_url: url, metadata: {} };
    if (parts[1]) {
      // try parse price (strip $)
      const maybe = parts[1].replace(/\$/g, "");
      const f = parseFloat(maybe);
      if (!Number.isNaN(f)) item.metadata = { ...item.metadata, price: f };
      else item.metadata = { ...item.metadata, note: parts[1] };
    }
    out.push(item);
  }

  return out;
}
