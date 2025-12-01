import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * Polling helper endpoint
 * GET /api/v1/ingest/job/:jobId
 *
 * Responses:
 * - 200 OK { ingestionId, normalized_payload, status, source_url } when ingestion is completed or normalized_payload exists
 * - 202 Accepted { jobId, status } when ingestion exists but not yet completed
 * - 202 Accepted { jobId, status: "accepted" } when no row exists yet
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
      // not yet created / still accepted by engine
      return NextResponse.json({ jobId, status: "accepted" }, { status: 202 });
    }

    // Determine if ingestion is finished/has usable normalized payload
    const hasPayload = data.normalized_payload && Object.keys(data.normalized_payload).length > 0;
    const isCompleted = (data.status && data.status.toLowerCase() === "completed") || !!data.completed_at;

    if (!hasPayload && !isCompleted) {
      // Still processing: surface current row status but keep HTTP 202 so client keeps polling
      return NextResponse.json(
        { jobId, ingestionId: data.id, status: data.status ?? "pending", message: "processing" },
        { status: 202 }
      );
    }

    // Row exists and either normalized_payload is present or status completed: return final data
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
