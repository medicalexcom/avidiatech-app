// Next.js App Router: POST /api/v1/ingest
import { NextResponse, type NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { signPayload } from "@/lib/ingest/signature";

const INGEST_ENGINE_URL = process.env.INGEST_ENGINE_URL || ""; // e.g. https://ingest-render.example.com/ingest
const INGEST_SECRET = process.env.INGEST_SECRET || "";
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * POST /api/v1/ingest
 *
 * - Creates a product_ingestions row immediately (status: pending).
 * - Attempts POST to ingestion engine (if configured).
 * - Persist engine call diagnostics into product_ingestions.diagnostics so we can inspect attempts.
 * - Returns ingestionId and jobId (202 Accepted).
 *
 * This is safe to deploy to production for debugging — diagnostics are stored per-row.
 */

export async function POST(req: NextRequest) {
  try {
    // Authenticate using safeGetAuth inside handler scope
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const url = (body?.url || "").toString();
    const clientOptions = body?.options || {};
    const fullExtract = !!body?.fullExtract;
    const export_type = body?.export_type || "JSON";
    const correlation_id = body?.correlationId || `corr_${Date.now()}`;

    if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });

    // create supabase client at runtime (throws if env not present)
    let supabase: any;
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
    if (insertError || !created) {
      console.error("failed to create ingestion record", insertError);
      return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
    }

    // Use the created row id as the jobId / ingestionId
    const ingestionId = created.id;
    const jobId = ingestionId;

    // Save job_id (if the column exists) - non-fatal
    try {
      await supabase.from("product_ingestions").update({ job_id: jobId, updated_at: new Date().toISOString() }).eq("id", ingestionId);
    } catch (e) {
      console.warn("failed to write job_id on ingestion row", e);
    }

    // Build payload to ingestion engine
    const payload = {
      correlation_id,
      job_id: jobId,
      tenant_id,
      url,
      options: effectiveOptions,
      export_type,
      callback_url: `${APP_URL}/api/v1/ingest/callback`,
      action: "ingest",
    };

    // Sign payload
    const signature = signPayload(JSON.stringify(payload), INGEST_SECRET);

    // Default diagnostics entry we'll save back to the row (so we can inspect from SQL)
    const engineCallRecordBase = {
      attempted_at: new Date().toISOString(),
      engine_url: INGEST_ENGINE_URL || null,
      attempted_payload_summary: {
        job_id: jobId,
        url,
        options: effectiveOptions,
        callback_url: `${APP_URL}/api/v1/ingest/callback`,
      },
    };

    // Post to ingestion engine (async fire-and-forget preferred)
    if (!INGEST_ENGINE_URL) {
      console.warn("INGEST_ENGINE_URL not configured; ingestion engine call skipped");
      // persist diagnostic that we skipped calling the engine
      try {
        await supabase.from("product_ingestions").update({
          diagnostics: { ...(created.diagnostics || {}), engine_call: { ...engineCallRecordBase, skipped: true, reason: "INGEST_ENGINE_URL not configured" } },
          updated_at: new Date().toISOString()
        }).eq("id", ingestionId);
      } catch (uErr) {
        console.warn("failed to persist engine_call diagnostics (skipped)", uErr);
      }
    } else {
      try {
        const res = await fetch(INGEST_ENGINE_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-avidiatech-signature": signature,
          },
          body: JSON.stringify(payload),
        });

        // ALWAYS read response body for logging/diagnostics
        const text = await res.text().catch(() => "");

        // Log to function logs too (helps when Vercel logs are visible)
        console.info("[ingest] engine call status=", res.status, "body=", text);

        // persist engine response into diagnostics so we can inspect via SQL
        try {
          await supabase.from("product_ingestions").update({
            diagnostics: { ...(created.diagnostics || {}), engine_call: { ...engineCallRecordBase, statusCode: res.status, responseBody: text } },
            updated_at: new Date().toISOString()
          }).eq("id", ingestionId);
        } catch (uErr) {
          console.warn("failed to persist engine_call diagnostics", uErr);
        }

        if (!res.ok) {
          console.warn("ingest engine responded non-OK", res.status, text);
          // we do not fail the ingest creation: job exists and engine can be retried externally
        }
      } catch (err) {
        console.error("failed to call ingest engine", err);
        // Persist the error to diagnostics
        try {
          await supabase.from("product_ingestions").update({
            diagnostics: { ...(created.diagnostics || {}), engine_call: { ...engineCallRecordBase, error: String(err) } },
            updated_at: new Date().toISOString()
          }).eq("id", ingestionId);
        } catch (uErr) {
          console.warn("failed to persist engine_call error diagnostic", uErr);
        }
        // continue: job exists and engine can be retried externally
      }
    }

    // Return stable ingestionId and jobId so frontend can continue immediately
    return NextResponse.json({ ingestionId, jobId, status: "accepted" }, { status: 202 });
  } catch (err: any) {
    console.error("POST /api/v1/ingest error:", err);
    return NextResponse.json({ error: err.message || "internal_error" }, { status: 500 });
  }
}
