import crypto from "crypto";

/**
 * normalizeUrl
 * - trims
 * - ensures scheme (defaults https)
 * - strips hash
 * - removes common tracking params
 * - collapses duplicate slashes (path only)
 * - normalizes hostname to lowercase
 */
export function normalizeUrl(input: string): string {
  const raw = (input ?? "").toString().trim();
  if (!raw) throw new Error("normalizeUrl: empty input");

  let s = raw;

  // If scheme missing, assume https
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) {
    s = `https://${s}`;
  }

  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new Error("normalizeUrl: invalid URL");
  }

  // strip fragment
  u.hash = "";

  // normalize host casing
  u.hostname = u.hostname.toLowerCase();

  // remove default ports
  if ((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80")) {
    u.port = "";
  }

  // remove tracking params
  const tracking = new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "gclid",
    "fbclid",
    "msclkid",
    "mc_cid",
    "mc_eid",
    "ref",
    "ref_src",
    "igshid",
  ]);

  const kept = new URLSearchParams();
  for (const [k, v] of u.searchParams.entries()) {
    const key = k.toLowerCase();
    if (tracking.has(key)) continue;
    // Default: keep all non-tracking params (some product pages require sku/variant params)
    kept.append(k, v);
  }

  // stable sort params (by key then value)
  const sorted = Array.from(kept.entries()).sort((a, b) => {
    if (a[0] === b[0]) return a[1].localeCompare(b[1]);
    return a[0].localeCompare(b[0]);
  });
  u.search = "";
  for (const [k, v] of sorted) u.searchParams.append(k, v);

  // collapse duplicate slashes in path (but keep leading slash)
  u.pathname = u.pathname.replace(/\/{2,}/g, "/");

  // drop trailing slash except root
  if (u.pathname.length > 1) {
    u.pathname = u.pathname.replace(/\/+$/, "");
  }

  return u.toString();
}

export function hashUrl(urlNorm: string): string {
  return crypto.createHash("sha256").update(urlNorm).digest("hex");
}

export function parseDomain(urlNorm: string): string | null {
  try {
    const u = new URL(urlNorm);
    return u.hostname || null;
  } catch {
    return null;
  }
}
