import { NextRequest, NextResponse } from "next/server";

// IMPORTANT: For this version, set INGEST_ENGINE_URL in Vercel to the FULL ingest URL
// e.g. https://medx-ingest-api.onrender.com/ingest
// (no trailing ?url=..., just up to /ingest)
const INGEST_ENGINE_URL = process.env.INGEST_ENGINE_URL || "";

function safeSnippet(t?: string, n = 800) {
  if (!t) return "";
  return t.length > n ? t.slice(0, n) + "…(truncated)" : t;
}

// GET /api/v1/ingest/preview?url=<product_url>
// Pure proxy to the MedicalEx ingest engine (medx-ingest-api).
export async function GET(request: NextRequest): Promise<NextResponse> {
  const urlParam = request.nextUrl.searchParams.get("url") || undefined;

  if (!urlParam) {
    return NextResponse.json({ ok: false, error: "missing url" }, { status: 400 });
  }

  if (!INGEST_ENGINE_URL) {
    return NextResponse.json(
      { ok: false, error: "INGEST_ENGINE_URL not configured" },
      { status: 500 }
    );
  }

  // Build the upstream URL based on how INGEST_ENGINE_URL is set.
  // Expected: INGEST_ENGINE_URL = "https://medx-ingest-api.onrender.com/engest"
  const base = INGEST_ENGINE_URL.replace(/\/+$/, "");
  const sep = base.includes("?") ? "&" : "?";

  // You can bake flags directly into INGEST_ENGINE_URL if you prefer,
  // or keep them here:
  const flags = "browse=true&harvest=true&sanitize=true&markdown=true&pdf=true";
  const target = `${base}${sep}url=${encodeURIComponent(urlParam)}&${flags}`;

  console.log("[preview] calling ingest engine:", target);

  try {
    const upstream = await fetch(target, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const contentType = upstream.headers.get("content-type") || "";
    const text = await upstream.text().catch(() => "");

    if (!upstream.ok) {
      const snippet = safeSnippet(text);

      if (
        contentType.includes("text/html") ||
        snippet.toLowerCase().includes("service suspended")
      ) {
        console.error("[preview] host HTML error:", snippet);
        return NextResponse.json(
          {
            ok: false,
            error: "Upstream ingest engine returned HTML/host error",
            upstream_status: upstream.status,
            upstream_snippet: snippet,
          },
          { status: 502 }
        );
      }

      try {
        const j = JSON.parse(text || "{}");
        console.error("[preview] upstream JSON error:", j);
        return NextResponse.json(
          { ok: false, error: "upstream_error", upstream_status: upstream.status, upstream: j },
          { status: upstream.status }
        );
      } catch {
        console.error("[preview] upstream non-JSON error:", snippet);
        return NextResponse.json(
          {
            ok: false,
            error: `Upstream error ${upstream.status}`,
            upstream_snippet: snippet,
          },
          { status: upstream.status }
        );
      }
    }

    try {
      const json = JSON.parse(text || "{}");
      return NextResponse.json(json, { status: 200 });
    } catch (e) {
      console.error("[preview] JSON parse error:", e, "body:", text);
      return NextResponse.json(
        { ok: false, error: "Upstream returned non-JSON response" },
        { status: 200 }
      );
    }
  } catch (err: any) {
    console.error("[preview] fetch failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to contact ingest engine",
        detail: String(err?.message || err),
      },
      { status: 502 }
    );
  }
}
