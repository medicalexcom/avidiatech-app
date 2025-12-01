import { NextResponse, NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * Polling helper endpoint
 * GET /api/v1/ingest/job/:jobId
 *
 * Response:
 * - 200 OK { ingestionId, normalized_payload, status } when ingestion row exists
 * - 202 Accepted { jobId, status: "accepted" } when not yet available
 */

export async function GET(request: NextRequest, { params }: { params: { jobId?: string } }) {
  try {
    const jobId = params?.jobId;
    if (!jobId) {
      return NextResponse.json({ error: { code: "MISSING_JOB_ID", message: "jobId param required" } }, { status: 400 });
    }

    const sb = getServiceSupabaseClient();
    const { data, error } = await sb
      .from("product_ingestions")
      .select("*")
      .eq("job_id", jobId)
      .limit(1)
      .single();

    if (error || !data) {
      // not yet created / still processing
      return NextResponse.json({ jobId, status: "accepted" }, { status: 202 });
    }

    // If row exists return ingestion id and normalized payload
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
