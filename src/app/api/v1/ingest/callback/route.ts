import { NextResponse, type NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { verifySignature } from "@/lib/ingest/signature";

const INGEST_SECRET = process.env.INGEST_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-avidiatech-signature") || "";

    if (!INGEST_SECRET) {
      console.error("INGEST_SECRET not configured on callback");
      return NextResponse.json(
        { error: "server_misconfigured" },
        { status: 500 }
      );
    }

    const valid = verifySignature(rawBody, signature, INGEST_SECRET);
    if (!valid) {
      console.warn("ingest callback invalid signature");
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody || "{}") as {
      job_id: string;
      status?: string;
      normalized_payload?: any;
      error?: string | null;
      diagnostics?: any;
    };

    const jobId = body.job_id;
    if (!jobId) {
      return NextResponse.json(
        { error: "missing job_id" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // Load existing row for diagnostics merging, attempts_count, etc.
    const { data: existing, error: loadErr } = await supabase
      .from("product_ingestions")
      .select(
        "id, status, diagnostics, attempts_count, last_error, created_at"
      )
      .or(`id.eq.${jobId},job_id.eq.${jobId}`)
      .limit(1)
      .maybeSingle();

    if (loadErr) {
      console.error(
        "ingest callback: failed to load product_ingestions",
        loadErr.message || loadErr
      );
      return NextResponse.json(
        { error: "db_error" },
        { status: 500 }
      );
    }

    if (!existing) {
      console.warn(
        "ingest callback: no product_ingestions row found for job_id=",
        jobId
      );
      return NextResponse.json(
        { error: "not_found" },
        { status: 404 }
      );
    }

    const currentAttempts = existing.attempts_count || 0;
    const existingDiagnostics = (existing.diagnostics as any) || {};

    const callbackDiagnostics = {
      ...(existingDiagnostics.ingest_callback || {}),
      last_callback_at: new Date().toISOString(),
      status: body.status || "completed",
      error: body.error || null,
      raw_diagnostics: body.diagnostics || null,
    };

    const updatedDiagnostics = {
      ...existingDiagnostics,
      ingest_callback: callbackDiagnostics,
    };

    const nextStatus = body.status || "completed";
    const updatePatch: any = {
      diagnostics: updatedDiagnostics,
      attempts_count: currentAttempts + 1,
      last_error: body.error || null,
      updated_at: new Date().toISOString(),
    };

    if (body.normalized_payload) {
      updatePatch.normalized_payload = body.normalized_payload;
      updatePatch.status = nextStatus;
      updatePatch.completed_at = new Date().toISOString();
    } else {
      // If no normalized_payload, we still record callback but may keep status as-is
      if (nextStatus !== "completed") {
        updatePatch.status = nextStatus;
      }
    }

    const { error: updErr } = await supabase
      .from("product_ingestions")
      .update(updatePatch)
      .eq("id", existing.id);

    if (updErr) {
      console.error(
        "ingest callback: failed to update product_ingestions",
        updErr.message || updErr
      );
      return NextResponse.json(
        { error: "db_update_failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("POST /api/v1/ingest/callback error:", err);
    return NextResponse.json(
      { error: err?.message || "internal_error" },
      { status: 500 }
    );
  }
}
