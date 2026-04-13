export async function fetchWithTimeout(url: string, opts: { timeoutMs?: number; headers?: Record<string,string>; maxBytes?: number } = {}) {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const signal = controller ? controller.signal : undefined;
  if (controller) setTimeout(() => controller.abort(), timeoutMs);

  const headers = { "User-Agent": "AvidiaMatch/1.0 (+https://your.app)", Accept: "text/html,application/xhtml+xml", ...(opts.headers ?? {}) };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { method: "GET", headers, signal } as any);
      const ct = res.headers.get("content-type") || "";
      const text = await res.text();
      return { ok: res.ok, status: res.status, text, contentType: ct };
    } catch (err:any) {
      if (attempt === 2) throw err;
      // backoff
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  throw new Error("unreachable");
}
