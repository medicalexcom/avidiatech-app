import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * Polling helper endpoint
 * GET /api/v1/ingest/job/:jobId
 *
 * Note: use Request.url parsing to avoid App Router typing mismatch for context.params.
 *
 * Responses:
 * - 200 OK { ingestionId, normalized_payload, status, source_url } when ingestion row exists
 * - 202 Accepted { jobId, status: "accepted" } when not yet available
 */

export async function GET(request: Request) {
  try {
    // Extract jobId from the request URL path (last path segment)
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const jobId = segments[segments.length - 1];
    if (!jobId) {
      return NextResponse.json({ error: { code: "MISSING_JOB_ID", message: "jobId path param required" } }, { status: 400 });
    }

    const sb = getServiceSupabaseClient();
    const { data, error } = await sb
      .from("product_ingestions")
      .select("*")
      .eq("job_id", jobId)
      .limit(1)
      .single();

    if (error || !data) {
      // still processing / not created yet
      return NextResponse.json({ jobId, status: "accepted" }, { status: 202 });
    }

    // Row exists: return ingestion id and normalized_payload (if present)
    return NextResponse.json(
      {
        ingestionId: data.id,
        status: data.status ?? "completed",
        normalized_payload: data.normalized_payload ?? null,
        source_url: data.source_url ?? null
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("GET /api/v1/ingest/job/:jobId error", e);
    return NextResponse.json({ error: { code: "INGEST_JOB_ERROR", message: String(e?.message || e) } }, { status: 500 });
  }
}
