/**
 * URL helpers for Match: canonicalization + filtering.
 */

export function canonicalizeUrl(input: string): string {
  const u = new URL(input);

  // drop tracking params
  const dropPrefixes = ["utm_", "gclid", "fbclid", "msclkid"];
  const dropExact = new Set(["srsltid"]);

  for (const key of Array.from(u.searchParams.keys())) {
    const lower = key.toLowerCase();
    if (dropExact.has(lower)) u.searchParams.delete(key);
    if (dropPrefixes.some((p) => lower.startsWith(p))) u.searchParams.delete(key);
  }

  // normalize trailing slash for consistency (keep "/" for root only)
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");

  // if no query params remain, remove "?"
  if (Array.from(u.searchParams.keys()).length === 0) u.search = "";

  return u.toString();
}

export function pathLooksLikeDownload(pathname: string): boolean {
  const p = (pathname || "").toLowerCase();
  if (!p) return false;

  if (p.includes("/amfile/")) return true;
  if (p.includes("/download/")) return true;
  if (p.endsWith(".pdf")) return true;
  if (p.endsWith(".doc") || p.endsWith(".docx")) return true;
  if (p.endsWith(".xls") || p.endsWith(".xlsx")) return true;
  if (p.endsWith(".zip")) return true;

  return false;
}

export function applyPathRules(url: string, rules?: { denyPathPrefixes?: string[]; allowPathRegex?: string }): boolean {
  if (!rules) return true;
  let pathname = "";
  try {
    pathname = new URL(url).pathname || "";
  } catch {
    return false;
  }

  const p = pathname.toLowerCase();

  if (rules.denyPathPrefixes && rules.denyPathPrefixes.length) {
    for (const pref of rules.denyPathPrefixes) {
      const pp = (pref || "").toLowerCase();
      if (!pp) continue;
      if (p.startsWith(pp)) return false;
    }
  }

  if (rules.allowPathRegex) {
    try {
      const re = new RegExp(rules.allowPathRegex, "i");
      if (!re.test(pathname)) return false;
    } catch {
      // bad regex => don't block everything; treat as no allow rule
      return true;
    }
  }

  return true;
}
