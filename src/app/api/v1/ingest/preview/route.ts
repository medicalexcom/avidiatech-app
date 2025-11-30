import { NextRequest, NextResponse } from "next/server";

const INGEST_ENGINE_URL = (process.env.INGEST_ENGINE_URL || "").replace(/\/+$/, "");

function safeSnippet(t?: string, n = 800) {
  if (!t) return "";
  return t.length > n ? t.slice(0, n) + "…(truncated)" : t;
}

// GET /api/v1/ingest/preview?url=<product_url>
// Pure proxy to the main MedicalEx ingest engine (medx-ingest-api).
export async function GET(request: NextRequest): Promise<NextResponse> {
  const urlParam = request.nextUrl.searchParams.get("url") || undefined;

  if (!urlParam) {
    return NextResponse.json({ ok: false, error: "missing url" }, { status: 400 });
  }

  if (!INGEST_ENGINE_URL) {
    return NextResponse.json(
      { ok: false, error: "ingest engine not configured" },
      { status: 500 }
    );
  }

  // These flags mirror how you usually call the engine from MedicalEx.
  const flags =
    "browse=true&harvest=true&sanitize=true&markdown=true&pdf=true";

  const target = `${ INGEST_ENGINE_URL }/ingest?url=${encodeURIComponent(
    urlParam
  )}&${flags}`;

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

      // Detect host HTML errors (Render / platform issues, etc.)
      if (
        contentType.includes("text/html") ||
        snippet.toLowerCase().includes("service suspended")
      ) {
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
        return NextResponse.json(
          { ok: false, upstream: j },
          { status: upstream.status }
        );
      } catch {
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

    // Success: parse JSON and return it as-is to the Extract dashboard.
    try {
      const json = JSON.parse(text || "{}");
      return NextResponse.json(json, { status: 200 });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Upstream returned non-JSON response" },
        { status: 200 }
      );
    }
  } catch (err: any) {
    console.error("preview fetch failed", err);
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
