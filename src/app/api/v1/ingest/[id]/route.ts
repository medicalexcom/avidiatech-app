import { NextResponse, NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

const INGEST_ENGINE_URL = (process.env.INGEST_ENGINE_URL || "").replace(/\/+$/, "");
const MAX_RETRY_ATTEMPTS = parseInt(process.env.INGEST_RETRY_MAX || "6", 10);

function safeSnippet(t?: string, n = 800) {
  if (!t) return "";
  return t.length > n ? t.slice(0, n) + "…(truncated)" : t;
}

export async function GET(request: NextRequest, context: any) {
  // Resolve params (handles Next variations where params may be a Promise)
  let paramsObj: any = context?.params;
  if (paramsObj && typeof paramsObj.then === "function") {
    try { paramsObj = await paramsObj; } catch { paramsObj = undefined; }
  }
  const id = paramsObj?.id;
  if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });

  const urlParam = request.nextUrl.searchParams.get("url") || undefined;
  const debug = request.nextUrl.searchParams.get("debug") === "1";

  // Helper to fetch DB job (used for idempotency checks)
  async function loadJob(supabase: any) {
    const { data, error } = await supabase.from("product_ingestions").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  }

  try {
    if (urlParam) {
      if (!INGEST_ENGINE_URL) {
        if (debug) console.warn("[ingest-preview] INGEST_ENGINE_URL not configured");
        return NextResponse.json({ ok: false, error: "ingest engine not configured" }, { status: 500 });
      }

      const target = `${INGEST_ENGINE_URL}/ingest?url=${encodeURIComponent(urlParam)}`;
      if (debug) console.log("[ingest-preview] calling engine", target);

      // call ingest engine
      let upstreamStatus = 0;
      let upstreamSnippet = "";
      let upstreamBodyText = "";
      let upstreamEtag: string | null = null;

      try {
        const upstream = await fetch(target, { method: "GET", headers: { Accept: "application/json" } });
        upstreamStatus = upstream.status;
        upstreamEtag = upstream.headers.get("etag");
        const contentType = upstream.headers.get("content-type") || "";
        upstreamBodyText = await upstream.text().catch(() => "");
        upstreamSnippet = safeSnippet(upstreamBodyText);

        if (!upstream.ok) {
          // upstream failure -> increment attempts_count and record last_error
          try {
            const supabase = getServiceSupabaseClient();
            await supabase.from("product_ingestions").update({
              attempts_count: (supabase.literal ? supabase.literal("COALESCE(attempts_count,0) + 1") : undefined),
              last_attempt_at: new Date().toISOString(),
              last_error: `upstream_non_ok_${upstream.status}:${upstreamSnippet}`,
            }).eq("id", id);
          } catch (e) {
            if (debug) console.warn("[ingest-preview] failed to record attempt", String(e));
          }

          if (debug) console.warn("[ingest-preview] upstream non-ok", upstreamStatus, contentType, upstreamSnippet);

          try {
            const j = JSON.parse(upstreamBodyText || "{}");
            return NextResponse.json({ ok: false, upstream_status: upstreamStatus, upstream: j }, { status: upstreamStatus });
          } catch {
            return NextResponse.json({ ok: false, upstream_status: upstreamStatus, upstream_snippet: upstreamSnippet, contentType }, { status: upstreamStatus });
          }
        }

        // upstream ok -> parse JSON
        let parsed: any;
        try {
          parsed = JSON.parse(upstreamBodyText || "{}");
        } catch (err) {
          // record attempt failure and return
          const supabase = getServiceSupabaseClient();
          try {
            await supabase.from("product_ingestions").update({
              attempts_count: (supabase.literal ? supabase.literal("COALESCE(attempts_count,0) + 1") : undefined),
              last_attempt_at: new Date().toISOString(),
              last_error: `upstream_non_json`,
            }).eq("id", id);
          } catch (e) {
            if (debug) console.warn("[ingest-preview] failed to record attempt (non-json)", String(e));
          }
          return NextResponse.json({ ok: false, error: "Upstream returned non-JSON response", upstream_snippet }, { status: 200 });
        }

        // best-effort: persist preview only if job not completed (idempotent)
        const supabase = getServiceSupabaseClient();
        let persisted = false;
        let persistError: any = null;
        try {
          const job = await loadJob(supabase);
          const alreadyCompleted = job?.status === "completed";
          const hasPayload = !!job?.normalized_payload;

          // persist only when not already completed OR if normalized_payload is null/empty
          if (!alreadyCompleted || !hasPayload) {
            const updates: any = {
              status: "completed",
              normalized_payload: parsed,
              preview_persisted_at: new Date().toISOString(),
              preview_source: "preview",
              preview_etag: upstreamEtag || null,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_error: null,
              attempts_count: (job?.attempts_count || 0) + 1,
              last_attempt_at: new Date().toISOString(),
            };

            const { error: updateError } = await supabase.from("product_ingestions").update(updates).eq("id", id);
            if (updateError) {
              persistError = updateError;
              if (debug) console.warn("[ingest-preview] supabase update error", String(updateError));
            } else {
              persisted = true;
              if (debug) console.log("[ingest-preview] persisted preview to DB", id);
            }
          } else {
            // already completed and has payload — do not overwrite
            if (debug) console.log("[ingest-preview] job already completed; skipping persist");
          }
        } catch (dbErr: any) {
          persistError = String(dbErr?.message || dbErr);
          if (debug) console.error("[ingest-preview] exception while persisting", persistError);
        }

        const envelope: any = parsed;
        if (debug) {
          envelope.__debug = {
            upstream_status,
            upstream_snippet,
            persisted,
            persistError: persistError ? String(persistError) : null,
            etag: upstreamEtag || null,
          };
        }

        return NextResponse.json(envelope, { status: 200 });
      } catch (err: any) {
        // network / fetch error -> record attempt
        try {
          const supabase = getServiceSupabaseClient();
          await supabase.from("product_ingestions").update({
            attempts_count: (supabase.literal ? supabase.literal("COALESCE(attempts_count,0) + 1") : undefined),
            last_attempt_at: new Date().toISOString(),
            last_error: String(err?.message || err),
          }).eq("id", id);
        } catch (e) {
          if (debug) console.warn("[ingest-preview] failed to record fetch error", String(e));
        }
        console.error("[ingest-preview] fetch failed", err);
        return NextResponse.json({ ok: false, error: "Failed to contact ingest engine", detail: String(err?.message || err) }, { status: 502 });
      }
    } // end urlParam

    // No url param: return job row
    try {
      const supabase = getServiceSupabaseClient();
      const { data, error } = await supabase.from("product_ingestions").select("*").eq("id", id).single();
      if (error) {
        if (debug) console.warn("[ingest-preview] db lookup failed", String(error));
        return NextResponse.json({ ok: false, error: "db_lookup_failed", detail: String(error) }, { status: 500 });
      }
      const resp: any = { ok: true, data };
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
