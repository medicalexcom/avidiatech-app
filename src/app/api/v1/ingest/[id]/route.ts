// src/app/api/v1/ingest/[id]/route.ts
// GET /api/v1/ingest/{id}?url=<url>
// - If ?url is present: call the ingestion engine's GET /ingest?url=... and return its JSON as a preview
// - Otherwise: return the DB row for the ingestion id (existing behavior)

import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

const INGEST_ENGINE_URL = (process.env.INGEST_ENGINE_URL || "").replace(/\/+$/, "");

function safeSnippet(t?: string, n = 800) {
  if (!t) return "";
  return t.length > n ? t.slice(0, n) + "…(truncated)" : t;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });

  try {
    const urlObj = new URL(request.url);
    const urlParam = urlObj.searchParams.get("url") || undefined;

    // If a URL param is present, try a synchronous preview by calling the ingest engine directly.
    if (urlParam) {
      if (!INGEST_ENGINE_URL) {
        return NextResponse.json({ ok: false, error: "ingest engine not configured" }, { status: 500 });
      }

      const target = `${INGEST_ENGINE_URL}/ingest?url=${encodeURIComponent(urlParam)}`;

      try {
        const upstream = await fetch(target, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          // no credentials required for server-to-server preview
        });

        const contentType = upstream.headers.get("content-type") || "";
        const text = await upstream.text().catch(() => "");

        if (!upstream.ok) {
          const snippet = safeSnippet(text);
          // detect host HTML errors
          if (contentType.includes("text/html") || snippet.toLowerCase().includes("service suspended")) {
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
            return NextResponse.json({ ok: false, upstream: j }, { status: upstream.status });
          } catch {
            return NextResponse.json({ ok: false, error: `Upstream error ${upstream.status}`, upstream_snippet: snippet }, { status: upstream.status });
          }
        }

        // success: try parse and return JSON as preview
        try {
          const json = JSON.parse(text || "{}");
          return NextResponse.json(json, { status: 200 });
        } catch {
          // upstream returned non-JSON success body
          return NextResponse.json({ ok: false, error: "Upstream returned non-JSON response" }, { status: 200 });
        }
      } catch (err: any) {
        console.error("preview fetch failed", err);
        return NextResponse.json({ ok: false, error: "Failed to contact ingest engine", detail: String(err?.message || err) }, { status: 502 });
      }
    }

    // No url param — return DB job row so existing UI polling still works.
    let supabase;
    try {
      supabase = getServiceSupabaseClient();
    } catch (err: any) {
      console.error("Supabase config missing", err);
      return NextResponse.json({ ok: false, error: "server misconfigured" }, { status: 500 });
    }

    const { data, error } = await supabase.from("product_ingestions").select("*").eq("id", id).single();
    if (error) {
      console.warn("db lookup failed", error);
      return NextResponse.json({ ok: false, error: "db_lookup_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/v1/ingest/[id] error", err);
    return NextResponse.json({ ok: false, error: "internal_error", detail: String(err?.message || err) }, { status: 500 });
  }
}
