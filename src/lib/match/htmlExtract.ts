import { domainOf } from "./netSafety";

/**
 * Extract absolute URLs from HTML by scanning href attributes.
 * Intentionally simple (no DOM parser dependency).
 */
export function extractLinksFromHtml(html: string, baseUrl: string): string[] {
  const out: string[] = [];
  if (!html) return out;

  // Extract href="..." and href='...'
  const re = /href\s*=\s*(?:"([^"]+)"|'([^']+)')/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = (m[1] ?? m[2] ?? "").trim();
    if (!raw) continue;
    if (raw.startsWith("javascript:")) continue;
    if (raw.startsWith("#")) continue;

    try {
      const abs = new URL(raw, baseUrl).toString();
      out.push(abs);
    } catch {
      // ignore
    }
  }
  return out;
}

/** Keep only URLs on the same host as baseUrl (optional). */
export function keepSameHost(urls: string[], baseUrl: string) {
  const baseHost = domainOf(baseUrl);
  return urls.filter((u) => domainOf(u) === baseHost);
}
