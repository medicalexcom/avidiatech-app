import { NextRequest, NextResponse } from "next/server";

// IMPORTANT: Set this in Vercel, e.g.:
//   INGEST_ENGINE_URL = https://medx-ingest-api.onrender.com/ingest
const INGEST_ENGINE_URL = process.env.INGEST_ENGINE_URL || "";

function safeSnippet(t?: string, n = 800) {
  if (!t) return "";
  return t.length > n ? t.slice(0, n) + "…(truncated)" : t;
}

// GET /api/v1/ingest/preview?url=<product_url>
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

  // Normalize base and build target
  const base = INGEST_ENGINE_URL.replace(/\/+$/, "");
  const sep = base.includes("?") ? "&" : "?";

  // You can tweak flags if needed
  const flags = "browse=true&harvest=true&sanitize=true&markdown=true&pdf=true";
  const target = `${base}${sep}url=${encodeURIComponent(urlParam)}&${flags}`;

  console.log("[preview] engine_url =", INGEST_ENGINE_URL);
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

      // Render “Service Suspended” or similar HTML
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
            engine_url: INGEST_ENGINE_URL,
            upstream_target: target,
          },
          { status: 502 }
        );
      }

      try {
        const j = JSON.parse(text || "{}");
        console.error("[preview] upstream JSON error:", j);
        return NextResponse.json(
          {
            ok: false,
            error: "upstream_error",
            upstream_status: upstream.status,
            upstream: j,
            engine_url: INGEST_ENGINE_URL,
            upstream_target: target,
          },
          { status: upstream.status }
        );
      } catch {
        console.error("[preview] upstream non-JSON error:", snippet);
        return NextResponse.json(
          {
            ok: false,
            error: `Upstream error ${upstream.status}`,
            upstream_snippet: snippet,
            engine_url: INGEST_ENGINE_URL,
            upstream_target: target,
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
        {
          ok: false,
          error: "Upstream returned non-JSON response",
          engine_url: INGEST_ENGINE_URL,
          upstream_target: target,
        },
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
        engine_url: INGEST_ENGINE_URL,
        upstream_target: target,
      },
      { status: 502 }
    );
  }
}
