import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * Robust polling: check product_ingestions.id OR product_ingestions.job_id (defensive).
 * Returns 202 until normalized_payload exists OR status is not pending/processing.
 */

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const jobId = segments[segments.length - 1];

    if (!jobId) {
      return NextResponse.json(
        {
          error: {
            code: "MISSING_JOB_ID",
            message: "jobId path param required",
          },
        },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    const { data, error } = await supabase
      .from("product_ingestions")
      .select(
        "id, status, normalized_payload, source_url, diagnostics, created_at, updated_at"
      )
      .or(`id.eq.${jobId},job_id.eq.${jobId}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "GET /api/v1/ingest/job/:jobId supabase error:",
        error.message || error
      );
      return NextResponse.json(
        {
          error: {
            code: "DB_ERROR",
            message: "Failed to load ingestion job",
          },
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Ingestion job not found",
          },
        },
        { status: 404 }
      );
    }

    const status = data.status || "pending";
    const hasNormalizedPayload = data.normalized_payload != null;

    const isPending =
      !hasNormalizedPayload &&
      (status === "pending" || status === "processing");

    if (isPending) {
      return NextResponse.json(
        {
          ingestionId: data.id,
          status,
          normalized_payload: null,
          source_url: data.source_url ?? null,
        },
        { status: 202 }
      );
    }

    // Completed (or at least not pending/processing) — return full payload
    return NextResponse.json(
      {
        ingestionId: data.id,
        status: hasNormalizedPayload ? status : status || "completed",
        normalized_payload: data.normalized_payload ?? null,
        source_url: data.source_url ?? null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("GET /api/v1/ingest/job/:jobId error", e);
    return NextResponse.json(
      {
        error: {
          code: "INGEST_JOB_ERROR",
          message: String(e?.message || e),
        },
      },
      { status: 500 }
    );
  }
}
