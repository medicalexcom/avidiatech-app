import { NextResponse, NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

const INGEST_ENGINE_URL = (process.env.INGEST_ENGINE_URL || "").replace(/\/+$/, "");

function safeSnippet(t?: string, n = 800) {
  if (!t) return "";
  return t.length > n ? t.slice(0, n) + "…(truncated)" : t;
}

// GET /api/v1/ingest/{id}?url=...
// If ?url present: call ingest engine for synchronous preview, persist preview to DB if JSON returned.
// Otherwise: return DB job row.
export async function GET(request: NextRequest, context: any) {
  // Resolve params whether Next supplies them directly or as a Promise
  let paramsObj: any = context?.params;
  if (paramsObj && typeof paramsObj.then === "function") {
    try { paramsObj = await paramsObj; } catch { paramsObj = undefined; }
  }
  const id = paramsObj?.id;
  if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });

  try {
    const urlParam = request.nextUrl.searchParams.get("url") || undefined;

    // If url provided -> attempt synchronous preview from ingest engine
    if (urlParam) {
      if (!INGEST_ENGINE_URL) {
        return NextResponse.json({ ok: false, error: "ingest engine not configured" }, { status: 500 });
      }

      const target = `${INGEST_ENGINE_URL}/ingest?url=${encodeURIComponent(urlParam)}`;

      try {
        const upstream = await fetch(target, { method: "GET", headers: { Accept: "application/json" } });
        const contentType = upstream.headers.get("content-type") || "";
        const text = await upstream.text().catch(() => "");

        if (!upstream.ok) {
          const snippet = safeSnippet(text);
          if (contentType.includes("text/html") || snippet.toLowerCase().includes("service suspended")) {
            return NextResponse.json({
              ok: false,
              error: "Upstream ingest engine returned HTML/host error",
              upstream_status: upstream.status,
              upstream_snippet: snippet,
            }, { status: 502 });
          }
          try {
            const j = JSON.parse(text || "{}");
            return NextResponse.json({ ok: false, upstream: j }, { status: upstream.status });
          } catch {
            return NextResponse.json({ ok: false, error: `Upstream error ${upstream.status}`, upstream_snippet: snippet }, { status: upstream.status });
          }
        }

        // success: try parse JSON and persist to DB
        let parsed: any = null;
        try {
          parsed = JSON.parse(text || "{}");
        } catch {
          return NextResponse.json({ ok: false, error: "Upstream returned non-JSON response" }, { status: 200 });
        }

        // Persist preview into product_ingestions.normalized_payload and mark completed
        let supabase;
        try {
          supabase = getServiceSupabaseClient();
        } catch (err: any) {
          console.warn("Supabase not configured; returning preview without persisting", err?.message || err);
          return NextResponse.json(parsed, { status: 200 });
        }

        try {
          const updated = {
            status: "completed",
            normalized_payload: parsed,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { error: updateError } = await supabase.from("product_ingestions").update(updated).eq("id", id);
          if (updateError) {
            console.warn("Failed to persist preview into DB", updateError);
            // still return the preview to the client even if DB update failed
            return NextResponse.json(parsed, { status: 200 });
          }

          // success: return preview JSON
          return NextResponse.json(parsed, { status: 200 });
        } catch (dbErr: any) {
          console.error("Error while persisting preview", dbErr);
          // return preview even if DB persistence failed
          return NextResponse.json(parsed, { status: 200 });
        }
      } catch (err: any) {
        console.error("preview fetch failed", err);
        return NextResponse.json({ ok: false, error: "Failed to contact ingest engine", detail: String(err?.message || err) }, { status: 502 });
      }
    }

    // No url param — return DB job row
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
