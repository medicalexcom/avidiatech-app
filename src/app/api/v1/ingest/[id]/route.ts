// src/app/api/v1/ingest/[id]/route.ts
// GET /api/v1/ingest/{id}?url=<url>
// - If ?url is present: call the ingestion engine's GET /ingest?url=... and return its JSON as a preview
// - Otherwise: return the DB row for the ingestion id (existing behavior)

import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

const RAW_INGEST_ENGINE_URL = process.env.INGEST_ENGINE_URL || "";
const INGEST_ENGINE_URL = RAW_INGEST_ENGINE_URL.replace(/\/+$/, "");

function safeSnippet(t?: string, n = 800) {
  if (!t) return "";
  return t.length > n ? t.slice(0, n) + "…(truncated)" : t;
}

type RouteParams = { id: string };

// NOTE: Next.js 16 expects `context.params` to be a Promise<{ id: string }>
export async function GET(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
): Promise<NextResponse> {
  let params: RouteParams;

  try {
    params = await context.params;
  } catch {
    return NextResponse.json({ ok: false, error: "missing params" }, { status: 400 });
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  }

  try {
    const urlParam = request.nextUrl.searchParams.get("url") || undefined;

    // If a URL param is present, try a synchronous preview by calling the ingest engine directly.
    if (urlParam) {
      if (!INGEST_ENGINE_URL) {
        return NextResponse.json(
          { ok: false, error: "ingest engine not configured" },
          { status: 500 }
        );
      }

      // Allow INGEST_ENGINE_URL to be either:
      // - https://medx-ingest-api.onrender.com
      // - or https://medx-ingest-api.onrender.com/ingest
      const base = INGEST_ENGINE_URL.replace(/\/+$/, "");
      const ingestBase = base.toLowerCase().endsWith("/ingest") ? base : `${base}/ingest`;
      const target = `${ingestBase}?url=${encodeURIComponent(urlParam)}`;

      console.log("[ingest[id]] engine_url =", RAW_INGEST_ENGINE_URL);
      console.log("[ingest[id]] calling ingest engine:", target);

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

          // detect host HTML errors (e.g. Render "Service Suspended")
          if (
            contentType.includes("text/html") ||
            snippet.toLowerCase().includes("service suspended")
          ) {
            console.error("[ingest[id]] host HTML error:", snippet);
            return NextResponse.json(
              {
                ok: false,
                error: "Upstream ingest engine returned HTML/host error",
                upstream_status: upstream.status,
                upstream_snippet: snippet,
                engine_url: RAW_INGEST_ENGINE_URL,
                upstream_target: target,
              },
              { status: 502 }
            );
          }

          try {
            const j = JSON.parse(text || "{}");
            console.error("[ingest[id]] upstream JSON error:", j);
            return NextResponse.json(
              {
                ok: false,
                upstream: j,
                upstream_status: upstream.status,
                engine_url: RAW_INGEST_ENGINE_URL,
                upstream_target: target,
              },
              { status: upstream.status }
            );
          } catch {
            console.error("[ingest[id]] upstream non-JSON error:", snippet);
            return NextResponse.json(
              {
                ok: false,
                error: `Upstream error ${upstream.status}`,
                upstream_snippet: snippet,
                engine_url: RAW_INGEST_ENGINE_URL,
                upstream_target: target,
              },
              { status: upstream.status }
            );
          }
        }

        // success: try parse and return JSON as preview
        try {
          const json = JSON.parse(text || "{}");
          return NextResponse.json(json, { status: 200 });
        } catch {
          // upstream returned non-JSON success body
          return NextResponse.json(
            {
              ok: false,
              error: "Upstream returned non-JSON response",
              engine_url: RAW_INGEST_ENGINE_URL,
              upstream_target: target,
            },
            { status: 200 }
          );
        }
      } catch (err: any) {
        console.error("[ingest[id]] preview fetch failed", err);
        return NextResponse.json(
          {
            ok: false,
            error: "Failed to contact ingest engine",
            detail: String(err?.message || err),
            engine_url: RAW_INGEST_ENGINE_URL,
            upstream_target: "build_failed",
          },
          { status: 502 }
        );
      }
    }

    // No url param — return DB job row so existing UI polling still works.
    let supabase;
    try {
      supabase = getServiceSupabaseClient();
    } catch (err: any) {
      console.error("[ingest[id]] Supabase config missing", err);
      return NextResponse.json(
        { ok: false, error: "server misconfigured" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("product_ingestions")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.warn("[ingest[id]] db lookup failed", error);
      return NextResponse.json(
        { ok: false, error: "db_lookup_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/v1/ingest/[id] error", err);
    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        detail: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}
