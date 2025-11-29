// server-side proxy for /api/v1/ingest
// - Accepts client POST with JSON { url: "...", ... }
// - Forwards to the Render ingest engine using the GET shape medx expects:
//     GET ${RENDER_ENGINE_ENDPOINT}/ingest?url=...
// - Returns parsed JSON on success, or structured JSON error on failure
import type { NextApiRequest, NextApiResponse } from "next";

const INGEST_ROOT =
  (process.env.RENDER_ENGINE_ENDPOINT || process.env.INGEST_API_ENDPOINT || "").replace(/\/+$/, "");

function safeSnippet(text: string | undefined, n = 800) {
  if (!text) return "";
  return text.length > n ? text.slice(0, n) + "…(truncated)" : text;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!INGEST_ROOT) {
    return res.status(500).json({ ok: false, error: "Ingest service not configured (RENDER_ENGINE_ENDPOINT)" });
  }

  try {
    // get url param from POST body or query
    const urlParam =
      (req.method === "GET" ? (req.query.url as string | undefined) : (req.body?.url as string | undefined)) ||
      (req.query.url as string | undefined);

    if (!urlParam) {
      return res.status(400).json({ ok: false, error: "Missing url param. Provide url in POST body or ?url query." });
    }

    const target = `${INGEST_ROOT}/ingest?url=${encodeURIComponent(urlParam)}`;

    // Forward as GET because medx expects GET /ingest?url=...
    const upstream = await fetch(target, {
      method: "GET",
      headers: {
        Accept: "application/json",
        // If you have an ingest API key that the ingest host expects, add it as server-only env:
        ...(process.env.INGEST_API_KEY ? { Authorization: `Bearer ${process.env.INGEST_API_KEY}` } : {}),
      },
    });

    const contentType = upstream.headers.get("content-type") || "";
    const text = await upstream.text().catch(() => "");

    if (!upstream.ok) {
      const snippet = safeSnippet(text);
      console.error("ingest upstream error", { target, status: upstream.status, contentType, snippet });

      // Detect upstream HTML (host page, suspended, etc.)
      if (contentType.includes("text/html") || snippet.toLowerCase().includes("service suspended")) {
        return res.status(502).json({
          ok: false,
          error: "Upstream ingest service returned an HTML error (host-level). Check ingest host or billing.",
          upstream_status: upstream.status,
          upstream_snippet: snippet,
        });
      }

      // Try to parse JSON error from upstream
      try {
        const j = JSON.parse(text || "{}");
        return res.status(upstream.status).json({ ok: false, upstream: j });
      } catch {
        return res.status(upstream.status).json({ ok: false, error: `Upstream error ${upstream.status}`, upstream_snippet: snippet });
      }
    }

    // Success — forward parsed JSON to client
    try {
      const json = JSON.parse(text || "{}");
      return res.status(200).json(json);
    } catch {
      // If upstream returned plain text (unlikely), forward it
      return res.status(200).send(text);
    }
  } catch (err: any) {
    console.error("ingest proxy unexpected error", err);
    return res.status(502).json({ ok: false, error: "Failed to contact ingest host", detail: String(err?.message || err) });
  }
}
