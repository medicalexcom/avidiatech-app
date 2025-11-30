import { NextResponse, NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

const INGEST_ENGINE_URL = (process.env.INGEST_ENGINE_URL || "").replace(/\/+$/, "");
// Optional backup engine (try this if primary returns HTML or non-JSON)
const INGEST_ENGINE_BACKUP_URL = (process.env.INGEST_ENGINE_BACKUP_URL || "").replace(/\/+$/, "");

function safeSnippet(t?: string, n = 800) {
  if (!t) return "";
  return t.length > n ? t.slice(0, n) + "…(truncated)" : t;
}

async function resolveParams(context: any) {
  let paramsObj: any = context?.params;
  if (paramsObj && typeof paramsObj.then === "function") {
    try {
      paramsObj = await paramsObj;
    } catch {
      paramsObj = undefined;
    }
  }
  return paramsObj;
}

/**
 * GET /api/v1/ingest/{id}?url=...&debug=1
 *
 * - If ?url is present: call the ingest engine for a synchronous preview.
 *   - On JSON success: return JSON.
 *   - On HTML/non-JSON: try backup engine if configured, otherwise fall back to returning DB row.
 * - If no ?url: return DB job row (existing behavior).
 *
 * This preserves debug info under ?debug=1 so you can inspect upstream snippets.
 */
export async function GET(request: NextRequest, context: any) {
  try {
    const paramsObj = await resolveParams(context);
    const id = paramsObj?.id;
    if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });

    const urlParam = request.nextUrl.searchParams.get("url") || undefined;
    const debug = request.nextUrl.searchParams.get("debug") === "1";

    // Helper: return DB job row
    const returnDbRow = async (extraDebug?: any) => {
      try {
        const supabase = getServiceSupabaseClient();
        const { data, error } = await supabase.from("product_ingestions").select("*").eq("id", id).single();
        if (error) {
          if (debug) console.warn("[ingest-preview] db lookup failed", String(error));
          return NextResponse.json({ ok: false, error: "db_lookup_failed", detail: String(error) }, { status: 500 });
        }
        const resp: any = { ok: true, data };
        if (debug) resp.__preview_debug = extraDebug ?? { note: "returned DB row (no preview available)" };
        return NextResponse.json(resp, { status: 200 });
      } catch (err: any) {
        console.error("[ingest-preview] supabase error", err);
        return NextResponse.json({ ok: false, error: "server_misconfigured", detail: String(err?.message || err) }, { status: 500 });
      }
    };

    if (urlParam) {
      if (!INGEST_ENGINE_URL) {
        if (debug) console.warn("[ingest-preview] INGEST_ENGINE_URL not configured");
        return returnDbRow({ warn: "ingest engine not configured" });
      }

      const callEngine = async (baseUrl: string) => {
        const target = `${baseUrl}/ingest?url=${encodeURIComponent(urlParam)}`;
        const upstream = await fetch(target, { method: "GET", headers: { Accept: "application/json" } });
        const status = upstream.status;
        const contentType = upstream.headers.get("content-type") || "";
        const text = await upstream.text().catch(() => "");
        return { upstream, status, contentType, text, snippet: safeSnippet(text) };
      };

      // Try primary engine
      try {
        const primary = await callEngine(INGEST_ENGINE_URL);

        // If upstream returned HTML or text/html -> try backup or fallback to DB row
        if (!primary.upstream.ok || primary.contentType.includes("text/html") || primary.snippet.toLowerCase().includes("service suspended")) {
          // Try backup if configured
          if (INGEST_ENGINE_BACKUP_URL) {
            try {
              const backup = await callEngine(INGEST_ENGINE_BACKUP_URL);
              if (backup.upstream.ok && backup.contentType.includes("application/json")) {
                // parse and return backup JSON
                try {
                  const parsed = JSON.parse(backup.text || "{}");
                  const envelope: any = parsed;
                  if (debug) envelope.__preview_debug = {
                    upstream: "backup",
                    upstream_status: backup.status,
                    upstream_snippet: backup.snippet,
                    note: "returned from backup engine",
                  };
                  return NextResponse.json(envelope, { status: 200 });
                } catch {
                  // backup returned non-JSON - fall through to DB row fallback
                }
              }
            } catch (bkErr) {
              if (debug) console.warn("[ingest-preview] backup engine call failed", String(bkErr));
            }
          }

          // No backup or backup failed -> fall back to DB row
          const extraDebug = {
            upstream: "primary",
            upstream_status: primary.status,
            upstream_snippet: primary.snippet,
            contentType: primary.contentType,
            note: "primary returned HTML/non-JSON; no backup JSON available",
          };
          return returnDbRow(extraDebug);
        }

        // primary OK and likely JSON -> parse and return
        try {
          const parsed = JSON.parse(primary.text || "{}");
          const envelope: any = parsed;
          if (debug) envelope.__preview_debug = {
            upstream: "primary",
            upstream_status: primary.status,
            upstream_snippet: primary.snippet,
          };
          return NextResponse.json(envelope, { status: 200 });
        } catch (err: any) {
          // Non-JSON success body -> fall back to DB row (but include snippet in debug)
          const extraDebug = {
            upstream: "primary",
            upstream_status: primary.status,
            upstream_snippet: primary.snippet,
            note: "primary returned non-JSON success body",
          };
          return returnDbRow(extraDebug);
        }
      } catch (err: any) {
        console.error("[ingest-preview] fetch failed", err);
        // On network/fetch error, fallback to DB row with debug
        return returnDbRow({ error: "fetch_failed", detail: String(err?.message || err) });
      }
    }

    // no url param -> return DB row
    return await returnDbRow();
  } catch (err: any) {
    console.error("GET /api/v1/ingest/[id] unexpected error", err);
    return NextResponse.json({ ok: false, error: "internal_error", detail: String(err?.message || err) }, { status: 500 });
  }
}
