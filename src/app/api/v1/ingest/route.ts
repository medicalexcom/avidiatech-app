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
 * - Sends a POST to the ingestion engine (if configured).
 * - Writes job_id on the created row (so pollers can find the row by jobId).
 * - Returns ingestionId (the DB row id) and jobId (same value) so frontend can continue.
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

    // Immediately set job_id column on the row so pollers can find it by jobId
    try {
      await supabase.from("product_ingestions").update({ job_id: jobId, updated_at: new Date().toISOString() }).eq("id", ingestionId);
    } catch (e) {
      // non-fatal: if update fails, we still return ingestionId
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

    // Post to ingestion engine (async fire-and-forget preferred)
    if (!INGEST_ENGINE_URL) {
      console.warn("INGEST_ENGINE_URL not configured; ingestion engine call skipped");
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

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.warn("ingest engine responded non-OK", res.status, text);
          // optionally update DB to mark engine call failed
        }
      } catch (err) {
        console.error("failed to call ingest engine", err);
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
