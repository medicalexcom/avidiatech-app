// POST /api/v1/ingest/:id/reprocess
// Allows running selected modules on an existing job using saved raw_payload (no re-scrape)
// This endpoint updates job.flags and options and asks the ingestion engine to run modules

import { NextResponse, type NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { signPayload } from "@/lib/ingest/signature";

const INGEST_ENGINE_URL = process.env.INGEST_ENGINE_URL || "";
const INGEST_SECRET = process.env.INGEST_SECRET || "";
const APP_URL =
  process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function normalizeBool(v: any): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

/**
 * HARD OPTION INVARIANT:
 * - If SEO is requested, specs MUST be requested.
 * This prevents downstream SEO/Describe placeholder failures and url-derived naming.
 */
function enforceOptionsInvariants(opts: any) {
  const o = { ...(opts || {}) };

  o.includeSeo = normalizeBool(o.includeSeo);
  o.includeSpecs = normalizeBool(o.includeSpecs);
  o.includeDocs = normalizeBool(o.includeDocs);
  o.includeVariants = normalizeBool(o.includeVariants);

  if (o.includeSeo) o.includeSpecs = true;

  return o;
}

export async function POST(req: NextRequest, context: { params?: any }) {
  try {
    // Authenticate using safeGetAuth inside handler scope
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const id = context?.params?.id;
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    if (!INGEST_ENGINE_URL || !INGEST_SECRET) {
      return NextResponse.json(
        { error: "ingest_engine_not_configured" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const requestedOptions = enforceOptionsInvariants(body?.options || {});

    const runNowFlags = {
      includeSeo: !!requestedOptions.includeSeo,
      includeSpecs: !!requestedOptions.includeSpecs,
      includeDocs: !!requestedOptions.includeDocs,
      includeVariants: !!requestedOptions.includeVariants,
    };

    // must request at least one module
    if (
      !runNowFlags.includeSeo &&
      !runNowFlags.includeSpecs &&
      !runNowFlags.includeDocs &&
      !runNowFlags.includeVariants
    ) {
      return NextResponse.json({ error: "no_modules_requested" }, { status: 400 });
    }

    // Create supabase client
    let supabase;
    try {
      supabase = getServiceSupabaseClient();
    } catch (err: any) {
      console.error("Supabase configuration missing", err?.message || err);
      return NextResponse.json(
        { error: "server_misconfigured_supabase" },
        { status: 500 }
      );
    }

    // Fetch job
    const { data: job, error: fetchErr } = await supabase
      .from("product_ingestions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !job) {
      console.warn("job not found", { id, fetchErr });
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Ensure raw_payload exists so we can reprocess without re-scraping.
    // If raw_payload absent, fall back to source_url and instruct engine to fetch again.
    const hasRaw = !!(job as any).raw_payload;

    // Merge flags (preserve previous flags and update)
    const newFlags = {
      ...((job as any).flags || {}),
      ...runNowFlags,
      full_extract: false, // reprocessing specific modules disables the job-level full_extract flag
    };

    // Update DB with new flags/options so audit/billing reflects reprocessing request
    await supabase
      .from("product_ingestions")
      .update({
        flags: newFlags,
        options: { ...((job as any).options || {}), ...runNowFlags },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Build payload for engine
    const payload: any = {
      action: "reprocess",
      job_id: id,
      tenant_id: (job as any).tenant_id || null,
      options: runNowFlags,
      callback_url: `${APP_URL}/api/v1/ingest/callback`,
      correlation_id: (job as any).correlation_id || null,
    };

    // Prefer attaching raw_payload to avoid re-scrape; engine can use provided raw if supported
    if (hasRaw) {
      payload.raw_payload = (job as any).raw_payload;
    } else {
      // fall back to asking engine to fetch URL again
      payload.url = (job as any).source_url;
    }

    // The engine endpoint: try to POST to INGEST_ENGINE_URL + '/reprocess' if available.
    // If INGEST_ENGINE_URL already ends with /ingest, we'll append /reprocess to it (ingest/reprocess)
    const reprocessUrl = INGEST_ENGINE_URL.replace(/\/$/, "") + "/reprocess";

    const signature = signPayload(JSON.stringify(payload), INGEST_SECRET);

    try {
      const res = await fetch(reprocessUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-avidiatech-signature": signature,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => "");

      if (!res.ok) {
        console.warn("ingest engine reprocess responded non-OK", res.status, text);
        // Return accepted but include engine reply
        return NextResponse.json(
          {
            jobId: id,
            status: "reprocess_failed",
            engineStatus: res.status,
            engineBody: text,
          },
          { status: 202 }
        );
      }

      return NextResponse.json({ jobId: id, status: "reprocess_started" }, { status: 202 });
    } catch (err) {
      console.error("failed to call ingest engine for reprocess", err);
      return NextResponse.json(
        { jobId: id, status: "reprocess_failed", error: String(err) },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("POST /api/v1/ingest/:id/reprocess error:", err);
    return NextResponse.json({ error: err.message || "internal_error" }, { status: 500 });
  }
}
