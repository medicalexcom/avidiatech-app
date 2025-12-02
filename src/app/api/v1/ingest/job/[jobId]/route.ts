import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * Robust polling: check product_ingestions.id OR product_ingestions.job_id (defensive).
 * Returns 202 until normalized_payload exists OR status === 'completed'.
 */

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const jobId = segments[segments.length - 1];
    if (!jobId) {
      return NextResponse.json({ error: { code: "MISSING_JOB_ID", message: "jobId path param required" } }, { status: 400 });
    }

    const sb = getServiceSupabaseClient();

    // Defensive query: look for a row where id = jobId OR job_id = jobId (some installs may use job_id)
    // Use PostgREST OR operator. Note: values are escaped by template string here (jobId is a UUID-like string).
    const orExpr = `id.eq.${jobId},job_id.eq.${jobId}`;
    const { data, error } = await sb
      .from("product_ingestions")
      .select("*")
      .or(orExpr)
      .limit(1)
      .single();

    if (error || !data) {
      // not created or not yet updated by worker
      return NextResponse.json({ jobId, status: "accepted" }, { status: 202 });
    }

    // Determine if ingestion is finished (has normalized_payload or is completed)
    const hasPayload = data.normalized_payload && Object.keys(data.normalized_payload).length > 0;
    const isCompleted = (data.status && String(data.status).toLowerCase() === "completed") || !!data.completed_at;

    if (!hasPayload && !isCompleted) {
      // Still processing; return 202 so client keeps polling
      return NextResponse.json(
        { jobId, ingestionId: data.id, status: data.status ?? "pending", message: "processing" },
        { status: 202 }
      );
    }

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
