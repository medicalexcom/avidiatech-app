import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * Robust polling: check product_ingestions.id OR product_ingestions.job_id.
 *
 * IMPORTANT (2025-12-28):
 * - Ingestion completion must gate on ingest_callback_at (durable callback marker),
 *   NOT on legacy status flipping away from "processing".
 * - If ingest_engine_status === "error", fail fast so UIs do not time out.
 *
 * Return contract:
 * - 202 while waiting for callback
 * - 409 when callback received but engine reported error
 * - 200 when callback received and engine did not report error
 *
 * NOTE:
 * The app's Supabase client types appear to allow `data` to be a union including an error-like type
 * (e.g. GenericStringError). We therefore treat the row as `any` after checking `error` and `data`.
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
        [
          "id",
          "job_id",
          "status",
          "source_url",
          "normalized_payload",
          "diagnostics",
          "created_at",
          "updated_at",
          "completed_at",
          "last_error",
          "error",
          "ingest_callback_at",
          "ingest_engine_status",
          "ingest_callback_request_id",
        ].join(",")
      )
      .or(`id.eq.${jobId},job_id.eq.${jobId}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("GET /api/v1/ingest/job/:jobId supabase error:", error.message || error);
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

    const row = data as any;

    const ingestionId = String(row.id ?? "");
    if (!ingestionId) {
      return NextResponse.json(
        {
          error: {
            code: "ROW_SHAPE_INVALID",
            message: "Loaded ingestion row missing id",
          },
        },
        { status: 500 }
      );
    }

    const hasCallback = Boolean(row.ingest_callback_at);
    const engineStatus = row.ingest_engine_status ?? null;

    // 1) Waiting for callback => 202 (keep polling)
    if (!hasCallback) {
      return NextResponse.json(
        {
          ok: true,
          ingestionId,
          jobId,
          status: row.status || "processing",
          ingest_callback_at: null,
          ingest_engine_status: null,
          normalized_payload: null,
          source_url: row.source_url ?? null,
        },
        { status: 202 }
      );
    }

    // 2) Callback received but engine error => 409 (fail fast)
    if (engineStatus === "error") {
      return NextResponse.json(
        {
          ok: false,
          ingestionId,
          jobId,
          status: "error",
          ingest_callback_at: row.ingest_callback_at,
          ingest_engine_status: engineStatus,
          ingest_callback_request_id: row.ingest_callback_request_id ?? null,
          last_error: row.last_error ?? null,
          error: row.error ?? null,
          source_url: row.source_url ?? null,
        },
        { status: 409 }
      );
    }

    // 3) Callback received and engine ok => 200
    return NextResponse.json(
      {
        ok: true,
        ingestionId,
        jobId,
        status: "completed",
        ingest_callback_at: row.ingest_callback_at,
        ingest_engine_status: engineStatus,
        ingest_callback_request_id: row.ingest_callback_request_id ?? null,
        normalized_payload: row.normalized_payload ?? null,
        source_url: row.source_url ?? null,
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
