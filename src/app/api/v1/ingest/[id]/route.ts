import { NextResponse, NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

const INGEST_ENGINE_URL = (process.env.INGEST_ENGINE_URL || "").replace(/\/+$/, "");

function safeSnippet(t?: string, n = 800) {
  if (!t) return "";
  return t.length > n ? t.slice(0, n) + "…(truncated)" : t;
}

// GET /api/v1/ingest/{id}?url=...&debug=1
// - If ?url present: call ingest engine, try to persist preview to DB,
//   and when ?debug=1 include upstream and DB diagnostics in the response.
// - Otherwise: return DB job row as before.
export async function GET(request: NextRequest, context: any) {
  // Resolve params (handles Next variations where params may be a Promise)
  let paramsObj: any = context?.params;
  if (paramsObj && typeof paramsObj.then === "function") {
    try { paramsObj = await paramsObj; } catch { paramsObj = undefined; }
  }
  const id = paramsObj?.id;
  if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });

  try {
    const urlParam = request.nextUrl.searchParams.get("url") || undefined;
    const debug = request.nextUrl.searchParams.get("debug") === "1";

    if (urlParam) {
      if (!INGEST_ENGINE_URL) {
        const resp = { ok: false, error: "ingest engine not configured" };
        if (debug) console.log("[ingest-preview] no INGEST_ENGINE_URL");
        return NextResponse.json(resp, { status: 500 });
      }

      const target = `${INGEST_ENGINE_URL}/ingest?url=${encodeURIComponent(urlParam)}`;
      if (debug) console.log("[ingest-preview] calling engine", target);

      let upstreamStatus = 0;
      let upstreamSnippet = "";
      let upstreamBodyText = "";
      try {
        const upstream = await fetch(target, { method: "GET", headers: { Accept: "application/json" } });
        upstreamStatus = upstream.status;
        const contentType = upstream.headers.get("content-type") || "";
        upstreamBodyText = await upstream.text().catch(() => "");
        upstreamSnippet = safeSnippet(upstreamBodyText);

        if (!upstream.ok) {
          if (debug) console.log("[ingest-preview] upstream non-ok", upstreamStatus, contentType, upstreamSnippet);
          // Try to parse JSON error
          try {
            const j = JSON.parse(upstreamBodyText || "{}");
            return NextResponse.json({ ok: false, upstream_status: upstreamStatus, upstream: j }, { status: upstreamStatus });
          } catch {
            return NextResponse.json(
              { ok: false, upstream_status: upstreamStatus, upstream_snippet: upstreamSnippet, contentType },
              { status: upstreamStatus }
            );
          }
        }

        // upstream ok -> parse JSON
        let parsed: any;
        try {
          parsed = JSON.parse(upstreamBodyText || "{}");
        } catch (err) {
          if (debug) console.log("[ingest-preview] upstream returned non-JSON", err);
          return NextResponse.json({ ok: false, error: "Upstream returned non-JSON response", upstream_snippet: upstreamSnippet }, { status: 200 });
        }

        // Try to persist to DB (best-effort). If Supabase not configured or update fails, still return preview.
        let persisted = false;
        let persistError: any = null;
        try {
          const supabase = getServiceSupabaseClient();
          if (supabase) {
            // Mark completed and write normalized_payload
            const updates = {
              status: "completed",
              normalized_payload: parsed,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            const { error: updateError, data: updateData } = await supabase.from("product_ingestions").update(updates).eq("id", id);
            if (updateError) {
              persistError = updateError;
              if (debug) console.log("[ingest-preview] supabase update error", updateError);
            } else {
              persisted = true;
              if (debug) console.log("[ingest-preview] persisted preview to DB", id);
            }
          } else {
            if (debug) console.log("[ingest-preview] no supabase client returned");
          }
        } catch (dbErr: any) {
          persistError = String(dbErr?.message || dbErr);
          if (debug) console.log("[ingest-preview] exception while persisting", persistError);
        }

        // Build debug envelope if requested
        const envelope: any = parsed;
        if (debug) {
          envelope.__debug = {
            upstream_status: upstreamStatus,
            upstream_snippet: upstreamSnippet,
            persisted,
            persistError: persistError ? String(persistError) : null,
          };
        }

        return NextResponse.json(envelope, { status: 200 });
      } catch (err: any) {
        console.error("[ingest-preview] fetch failed", err);
        return NextResponse.json({ ok: false, error: "Failed to contact ingest engine", detail: String(err?.message || err) }, { status: 502 });
      }
    }

    // No url param — return DB job row
    try {
      const supabase = getServiceSupabaseClient();
      if (!supabase) throw new Error("supabase not configured");
      const { data, error } = await supabase.from("product_ingestions").select("*").eq("id", id).single();
      if (error) {
        if (debug) console.log("[ingest-preview] db lookup failed", error);
        return NextResponse.json({ ok: false, error: "db_lookup_failed", detail: String(error) }, { status: 500 });
      }
      const resp = { ok: true, data };
      if (debug) resp.__debug = { note: "returned DB row" };
      return NextResponse.json(resp, { status: 200 });
    } catch (err: any) {
      console.error("[ingest-preview] supabase error", err);
      return NextResponse.json({ ok: false, error: "server misconfigured", detail: String(err?.message || err) }, { status: 500 });
    }
  } catch (err: any) {
    console.error("[ingest-preview] unexpected error", err);
    return NextResponse.json({ ok: false, error: "internal_error", detail: String(err?.message || err) }, { status: 500 });
  }
}
