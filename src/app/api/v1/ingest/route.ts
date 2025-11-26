// POST /api/v1/ingest
import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { getAuth } from "@clerk/nextjs/server";

const INGEST_ENGINE_URL = process.env.INGEST_ENGINE_URL || "";
const INGEST_SECRET = process.env.INGEST_SECRET || "";
const APP_URL = process.env.APP_URL || "";
const INGEST_ALLOW_UNAUTH = process.env.INGEST_ALLOW_UNAUTH === "1";
const INGEST_TEST_KEY = process.env.INGEST_TEST_KEY || "";
// Gate debug logging so we can enable it briefly in production
const ENABLE_ENQUEUE_DEBUG = process.env.INGEST_ENQUEUE_DEBUG === "1";

function signBody(body: string) {
  if (!INGEST_SECRET) return "";
  return crypto.createHmac("sha256", INGEST_SECRET).update(body).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuth(req as any);
    const userId = auth?.userId || null;

    // Read request body
    const body = await req.json().catch(() => ({}));
    const url = body?.url || body?.source_url || null;
    if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });

    // If unauthenticated and not allowed via env, return 401
    if (!userId && !INGEST_ALLOW_UNAUTH) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // If unauthenticated but INGEST_TEST_KEY is set, require header match
    if (!userId && INGEST_ALLOW_UNAUTH && INGEST_TEST_KEY) {
      const provided = req.headers.get("x-ingest-test-key") || "";
      if (!provided || provided !== INGEST_TEST_KEY) {
        return NextResponse.json({ error: "invalid_test_key" }, { status: 401 });
      }
    }

    // Build options mapping
    const fullExtract = !!body.fullExtract;
    const clientOptions = body.options || body.options_used || {};
    // If fullExtract is requested, request every module (match MedicalEx full extract behaviour)
    const effectiveOptions = fullExtract
      ? { includeSeo: true, includeSpecs: true, includeDocs: true, includeVariants: true }
      : {
          includeSeo: !!clientOptions.includeSeo || !!body.includeSeo || false,
          includeSpecs: !!clientOptions.includeSpecs || !!body.includeSpecs || false,
          includeDocs: !!clientOptions.includeDocs || !!body.includeDocs || false,
          includeVariants: !!clientOptions.includeVariants || !!body.includeVariants || false,
        };

    // Persist a pending product_ingestions row
    let supabase;
    try {
      supabase = getServiceSupabaseClient();
    } catch (err: any) {
      console.error("Supabase client not configured", err?.message || err);
      return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
    }

    const insertRow: any = {
      tenant_id: null,
      user_id: userId,
      source_url: url,
      status: "pending",
      flags: { full_extract: fullExtract },
      options_used: effectiveOptions,
      created_at: new Date().toISOString(),
    };

    // include correlation id if provided
    if (body.correlationId || body.correlation_id) {
      insertRow.correlation_id = body.correlationId || body.correlation_id;
    }

    // Insert row
    const { data: created, error: insertErr } = await supabase.from("product_ingestions").insert(insertRow).select("id").single();
    if (insertErr || !created) {
      console.error("failed to create ingestion row", insertErr);
      return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
    }
    const jobId = created.id;

    // Prepare payload for engine
    const enginePayload: any = {
      job_id: jobId,
      correlation_id: insertRow.correlation_id || `corr_${Date.now()}`,
      url,
      tenant_id: insertRow.tenant_id,
      user_id: userId,
      options: effectiveOptions,
      export_type: body.export_type || body.exportType || "JSON",
      callback_url: `${APP_URL.replace(/\/$/, "")}/api/v1/ingest/callback`,
    };

    const payloadBody = JSON.stringify(enginePayload);
    const signature = signBody(payloadBody);

    // Debug logging: show the engine URL, payload size/keys and log response (gated)
    if (ENABLE_ENQUEUE_DEBUG) {
      try {
        console.log("ENQUEUE: posting to", INGEST_ENGINE_URL);
        console.log("ENQUEUE: payload_len", Buffer.byteLength(payloadBody, "utf8"));
        console.log("ENQUEUE: payload_keys", Object.keys(enginePayload));
      } catch (e) {
        // noop
      }
    }

    // Post to engine (best-effort; don't fail the request if engine rejects — return job id to caller)
    let engineResText = "";
    try {
      const res = await fetch(INGEST_ENGINE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-avidiatech-signature": signature,
        },
        body: payloadBody,
      });
      engineResText = await res.text();

      // Additional debug logging for engine response
      if (ENABLE_ENQUEUE_DEBUG) {
        console.log("ENQUEUE RESPONSE STATUS:", res.status);
        console.log("ENQUEUE RESPONSE BODY (truncated):", engineResText ? engineResText.slice(0, 2000) : "<empty>");
      }

      if (!res.ok) {
        console.warn("engine enqueue returned non-ok", res.status, engineResText);
        // store a diagnostics note on the row
        await supabase.from("product_ingestions").update({ diagnostics: { enqueue_error: engineResText, enqueue_status: res.status } }).eq("id", jobId);
      }
    } catch (err: any) {
      console.error("failed to call ingest engine", err?.message || err);
      await supabase.from("product_ingestions").update({ diagnostics: { enqueue_exception: String(err?.message || err) } }).eq("id", jobId);
    }

    // Return the job id so the UI can poll the job
    return NextResponse.json({ id: jobId, status: "pending", engine_response: engineResText }, { status: 202 });
  } catch (err: any) {
    console.error("ingest route error", err);
    return NextResponse.json({ error: err?.message || "internal_error" }, { status: 500 });
  }
}
