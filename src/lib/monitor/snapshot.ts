import { extractAndIngest } from "@/services/avidiaExtractToIngest";
import { sha256Hex } from "./hash";

export type MonitorSnapshot = {
  seo: { h1: string | null; title: string | null; meta_description: string | null; canonical: string | null };
  price: { value: number | null; currency: string | null; type: "list" | "sale" | "unknown" } | null;
  specs: Record<string, string>;
  manuals: Array<{ label: string | null; url: string; type: "pdf" }>;
  images: Array<{ url: string; role: "primary" | "gallery" | "unknown"; alt: string | null }>;
  variants: { options: any[]; children: any[] };
};

export type SnapshotHashes = {
  seo: string;
  price: string;
  specs: string;
  manuals: string;
  images: string;
  variants: string;
};

function toStringOrNull(v: any): string | null {
  if (typeof v === "string") {
    const s = v.trim();
    return s ? s : null;
  }
  return null;
}

function toNumberOrNull(v: any): number | null {
  const n = typeof v === "number" ? v : (typeof v === "string" ? Number(v) : NaN);
  return Number.isFinite(n) ? n : null;
}

export function buildSnapshotFromExtract(normalized: any): MonitorSnapshot {
  const base = normalized?.normalized_payload ?? normalized?.data?.normalized_payload ?? normalized?.data ?? normalized ?? {};

  const seoSrc = base?.seo ?? base?.seo_payload ?? {};
  const seo = {
    h1: toStringOrNull(seoSrc?.h1 ?? base?.h1),
    title: toStringOrNull(seoSrc?.title ?? seoSrc?.meta_title ?? base?.meta_title),
    meta_description: toStringOrNull(seoSrc?.meta_description ?? seoSrc?.metaDescription ?? base?.meta_description),
    canonical: toStringOrNull(seoSrc?.canonical ?? base?.canonical),
  };

  // Price: ingest schemas show price as number; currency may be absent
  const priceValue = toNumberOrNull(base?.price ?? base?.price_value ?? base?.current_price);
  const currency = toStringOrNull(base?.currency ?? base?.price_currency) ?? null;
  const priceType = (toStringOrNull(base?.price_type) ?? "unknown") as "list" | "sale" | "unknown";
  const price = priceValue === null ? null : { value: priceValue, currency, type: ["list", "sale"].includes(priceType) ? priceType : "unknown" };

  // Specs: prefer specs_json/specs object; normalize to string values
  const specsRaw = base?.specs_json ?? base?.specs ?? base?.specs_payload ?? {};
  const specs: Record<string, string> = {};
  if (specsRaw && typeof specsRaw === "object" && !Array.isArray(specsRaw)) {
    for (const [k, v] of Object.entries(specsRaw)) {
      const key = String(k).trim();
      if (!key) continue;
      if (v === null || v === undefined) continue;
      const val = Array.isArray(v) ? v.map((x) => String(x)).join(", ") : String(v);
      const s = val.trim();
      if (s) specs[key] = s;
    }
  }

  // Manuals: ingest often returns pdf_manual_urls
  const pdfs = base?.pdf_manual_urls ?? base?.pdfs ?? base?.manuals ?? [];
  const manuals: Array<{ label: string | null; url: string; type: "pdf" }> = [];
  if (Array.isArray(pdfs)) {
    for (const p of pdfs) {
      if (typeof p === "string" && /^https?:\/\//i.test(p)) {
        manuals.push({ label: null, url: p, type: "pdf" });
      } else if (p && typeof p === "object" && typeof p.url === "string") {
        manuals.push({ label: toStringOrNull(p.label ?? p.name), url: p.url, type: "pdf" });
      }
    }
  }

  // Images
  const imgs = base?.images ?? base?.image_urls ?? [];
  const images: Array<{ url: string; role: "primary" | "gallery" | "unknown"; alt: string | null }> = [];
  if (Array.isArray(imgs)) {
    for (let i = 0; i < imgs.length; i++) {
      const it = imgs[i];
      if (typeof it === "string" && /^https?:\/\//i.test(it)) {
        images.push({ url: it, role: i === 0 ? "primary" : "gallery", alt: null });
      } else if (it && typeof it === "object" && typeof it.url === "string") {
        images.push({
          url: it.url,
          role: (it.role === "primary" || it.role === "gallery") ? it.role : (i === 0 ? "primary" : "unknown"),
          alt: toStringOrNull(it.alt),
        });
      }
    }
  }

  // Variants: keep minimal stable shape; do not store huge blobs
  const variantsRaw = base?.variants ?? null;
  const variants = {
    options: Array.isArray(variantsRaw?.options) ? variantsRaw.options : [],
    children: Array.isArray(variantsRaw?.children) ? variantsRaw.children : (Array.isArray(variantsRaw) ? variantsRaw : []),
  };

  return { seo, price, specs, manuals, images, variants };
}

export function computeHashes(snapshot: MonitorSnapshot): SnapshotHashes {
  return {
    seo: sha256Hex(snapshot.seo),
    price: sha256Hex(snapshot.price),
    specs: sha256Hex(snapshot.specs),
    manuals: sha256Hex(snapshot.manuals),
    images: sha256Hex(snapshot.images),
    variants: sha256Hex(snapshot.variants),
  };
}

export async function createSnapshotFromUrl(url: string): Promise<{ snapshot: MonitorSnapshot; raw: any; fetchMs: number }> {
  const started = Date.now();
  const raw = await extractAndIngest(url, {
    ingestApiEndpoint: process.env.INGEST_API_ENDPOINT,
    ingestApiKey: process.env.INGEST_API_KEY,
    timeoutMs: 120_000,
    retries: 2,
  });
  const fetchMs = Date.now() - started;
  const snapshot = buildSnapshotFromExtract(raw);
  return { snapshot, raw, fetchMs };
}
