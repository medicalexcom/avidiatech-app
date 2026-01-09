export function domainOf(u: string) {
  try {
    return new URL(u).hostname;
  } catch {
    return "";
  }
}

function isPrivateIp(ip: string) {
  if (!ip) return false;
  // simple checks for private ranges
  if (/^(127\.0\.0\.1|localhost)$/i.test(ip)) return true;
  // IPv4
  const parts = ip.split(".");
  if (parts.length === 4) {
    const [a, b] = parts.map((p) => parseInt(p, 10));
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  // IPv6 unspecified checks — treat as safe only if not link-local
  if (ip.startsWith("fe80") || ip.startsWith("::1")) return true;
  return false;
}

export function isSafePublicUrl(u: string) {
  try {
    const url = new URL(u);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost") return false;
    // try to detect IP
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host) && isPrivateIp(host)) return false;
    if (host.startsWith("10.") || host.startsWith("192.168.") || host.match(/^172\.(1[6-9]|2\d|3[0-1])\./)) return false;
    // metadata AWS etc
    if (host.endsWith(".local") || host === "169.254.169.254") return false;
    return true;
  } catch {
    return false;
  }
}

export function allowlistedDomainsForSupplier(_supplierKey: string) : string[] {
  // placeholder: return list or read from config/env
  return [];
}
