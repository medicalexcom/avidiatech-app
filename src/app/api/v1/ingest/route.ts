// Next.js App Router: POST /api/v1/ingest
import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { signPayload } from "@/lib/ingest/signature";

const INGEST_ENGINE_URL = process.env.INGEST_ENGINE_URL || ""; // e.g. https://medx-ingest-api.onrender.com
const INGEST_SECRET = process.env.INGEST_SECRET || "";
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * POST /api/v1/ingest
 *
 * Accepts:
 *  - fullExtract: boolean (if true, server maps to include* = true)
 *  - options: { includeSeo, includeSpecs, includeDocs, includeVariants } (used when fullExtract is false)
 *  - export_type
 *
 * Behavior changes:
 * - Creates a product_ingestions row (status: pending) as before.
 * - Calls the ingestion engine in the shape this host expects:
 *     GET ${INGEST_ENGINE_URL}/ingest?url=...
 *   (medx currently expects a URL query for synchronous extraction).
 * - If the engine returns 200 JSON immediately, update the ingestion row to 'completed'
 *   and persist normalized_payload so dashboard shows results right away.
 * - If the engine returns non-OK or fails, keep the job as pending and log the upstream snippet.
 *
 * This keeps your current UI (client POST) unchanged while adapting proxy behavior to the engine.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const url = (body?.url || "").toString();
    const clientOptions = body?.options || {};
    const fullExtract = !!body?.fullExtract;
    const export_type = body?.export_type || "JSON";
    const correlation_id = body?.correlationId || `corr_${Date.now()}`;

    if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });

    // create supabase client at runtime (throws if env not present)
    let supabase;
    try {
      supabase = getServiceSupabaseClient();
    } catch (err: any) {
      console.error("Supabase configuration missing", err?.message || err);
      return NextResponse.json({ error: "server misconfigured: missing Supabase envs" }, { status: 500 });
    }

    // Resolve profile / tenant (profiles table assumed)
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, tenant_id, role")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (profileError) {
      console.warn("profile lookup failed", profileError);
      return NextResponse.json({ error: "profile lookup failed" }, { status: 500 });
    }

    const tenant_id = profileData?.tenant_id || null;
    const role = profileData?.role || "user";

    // Usage/quota check (unless owner)
    if (role !== "owner") {
      const { data: counters } = await supabase.from("usage_counters").select("*").eq("tenant_id", tenant_id).limit(1).single();
      // simple check: if absent allow — real logic should check month and quotas
      if (counters && typeof counters.ingest_calls === "number") {
        const monthlyLimit = process.env.DEFAULT_MONTHLY_INGEST_LIMIT ? parseInt(process.env.DEFAULT_MONTHLY_INGEST_LIMIT) : 1000;
        if (counters.ingest_calls >= monthlyLimit) {
          return NextResponse.json({ error: "quota_exceeded" }, { status: 402 });
        }
      }
    }

    // Build effective options:
    const effectiveOptions = fullExtract
      ? { includeSeo: true, includeSpecs: true, includeDocs: true, includeVariants: true }
      : {
          includeSeo: !!clientOptions.includeSeo,
          includeSpecs: !!clientOptions.includeSpecs,
          includeDocs: !!clientOptions.includeDocs,
          includeVariants: !!clientOptions.includeVariants,
        };

    // persist flags for reprocessing and billing
    const flags = {
      full_extract: fullExtract,
      includeSeo: !!effectiveOptions.includeSeo,
      includeSpecs: !!effectiveOptions.includeSpecs,
      includeDocs: !!effectiveOptions.includeDocs,
      includeVariants: !!effectiveOptions.includeVariants,
    };

    // Create product_ingestions row (status: pending)
    const insert = {
      tenant_id,
      user_id: userId,
      source_url: url,
      status: "pending",
      options: effectiveOptions,
      flags,
      export_type,
      correlation_id,
      created_at: new Date().toISOString(),
    };

    const { data: created, error: insertError } = await supabase.from("product_ingestions").insert(insert).select("*").single();
    if (insertError) {
      console.error("failed to create ingestion record", insertError);
      return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
    }

    const jobId = created.id;

    // Build payload for signature (keep for compatibility if engine checks signature)
    const payloadForSignature = {
      correlation_id,
      job_id: jobId,
      tenant_id,
      url,
      options: effectiveOptions,
      export_type,
      callback_url: `${APP_URL}/api/v1/ingest/callback`,
      action: "ingest",
    };

    const signature = signPayload(JSON.stringify(payloadForSignature), INGEST_SECRET);

    // Call ingestion engine using the query-style medx expects: GET /ingest?url=...
    // medx's implementation currently returns extracted JSON synchronously for this call.
    if (!INGEST_ENGINE_URL) {
      console.warn("INGEST_ENGINE_URL not configured; ingestion engine call skipped");
    } else {
      try {
        // Build target using base (no trailing slash) + /ingest
        const base = INGEST_ENGINE_URL.replace(/\/+$/, "");
        const target = `${base}/ingest?url=${encodeURIComponent(url)}`;

        const res = await fetch(target, {
          method: "GET",
          headers: {
            Accept: "application/json",
            // keep signature header for engines that expect it — harmless if ignored
            ...(signature ? { "x-avidiatech-signature": signature } : {}),
          },
        });

        const text = await res.text().catch(() => "");
        const contentType = res.headers.get("content-type") || "";

        if (!res.ok) {
          // Upstream returned non-OK; log a snippet and leave the job pending so it can be retried or inspected
          const snippet = text?.slice(0, 800);
          console.warn("ingest engine responded non-OK", res.status, snippet);
          // Optionally update DB with external error metadata
          await supabase.from("product_ingestions").update({
            engine_status: res.status,
            engine_error_snippet: snippet,
            updated_at: new Date().toISOString(),
          }).eq("id", jobId);
        } else {
          // Upstream returned success (likely JSON). Try parse and persist normalized payload & mark completed.
          try {
            const json = JSON.parse(text || "{}");
            await supabase.from("product_ingestions").update({
              status: "completed",
              normalized_payload: json,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("id", jobId);

            // Return accepted + include jobId and optionally the extracted preview
            return NextResponse.json({ jobId, status: "completed", preview: json }, { status: 200 });
          } catch (err) {
            // If parsing fails, mark job pending with snippet
            console.warn("ingest engine returned non-JSON success body", err);
            await supabase.from("product_ingestions").update({
              engine_status: 200,
              engine_error_snippet: (text || "").slice(0, 800),
              updated_at: new Date().toISOString(),
            }).eq("id", jobId);
          }
        }
      } catch (err) {
        console.error("failed to call ingest engine", err);
        // leave job pending; record the error
        await supabase.from("product_ingestions").update({
          engine_error_snippet: String(err?.message || err).slice(0, 800),
          updated_at: new Date().toISOString(),
        }).eq("id", jobId);
      }
    }

    // Default: return accepted with jobId (engine may have completed synchronously above)
    return NextResponse.json({ jobId, status: "accepted" }, { status: 202 });
  } catch (err: any) {
    console.error("POST /api/v1/ingest error:", err);
    return NextResponse.json({ error: err.message || "internal_error" }, { status: 500 });
  }
}
