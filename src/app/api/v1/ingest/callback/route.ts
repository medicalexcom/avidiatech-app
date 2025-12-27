import { NextResponse, type NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { verifySignature } from "@/lib/ingest/signature";

const INGEST_SECRET = process.env.INGEST_SECRET || "";

/**
 * Ingest callback endpoint.
 *
 * Called by the ingest engine (medx-ingest-api) after extraction completes.
 *
 * Security:
 * - Requires x-avidiatech-signature signed with INGEST_SECRET.
 *
 * Expected JSON body:
 * {
 *   job_id: string,
 *   status?: string,
 *   normalized_payload?: any,
 *   error?: string|null,
 *   diagnostics?: any
 * }
 */
export async function GET() {
  // Simple reachability probe (does NOT leak secrets)
  return NextResponse.json(
    {
      ok: true,
      route: "ingest_callback",
      ingest_secret_configured: Boolean(INGEST_SECRET),
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-avidiatech-signature") || "";

    if (!INGEST_SECRET) {
      console.error("[ingest/callback] INGEST_SECRET not configured");
      return NextResponse.json(
        { ok: false, error: "server_misconfigured", detail: "INGEST_SECRET missing" },
        { status: 500 }
      );
    }

    const valid = verifySignature(rawBody, signature, INGEST_SECRET);
    if (!valid) {
      console.warn("[ingest/callback] invalid signature", {
        hasSignature: Boolean(signature),
        bodySnippet: rawBody ? rawBody.slice(0, 300) : "",
      });
      return NextResponse.json(
        { ok: false, error: "invalid_signature" },
        { status: 401 }
      );
    }

    let body: {
      job_id: string;
      status?: string;
      normalized_payload?: any;
      error?: string | null;
      diagnostics?: any;
    };

    try {
      body = JSON.parse(rawBody || "{}");
    } catch (e: any) {
      console.error("[ingest/callback] JSON parse failed", e?.message || e);
      return NextResponse.json(
        { ok: false, error: "invalid_json" },
        { status: 400 }
      );
    }

    const jobId = body.job_id;
    if (!jobId) {
      return NextResponse.json(
        { ok: false, error: "missing_job_id" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // Load existing row for diagnostics merging
    // NOTE: attempts_count + last_error now exist (you added them), but we still read defensively.
    const { data: existing, error: loadErr } = await supabase
      .from("product_ingestions")
      .select("id, status, diagnostics, attempts_count, last_error, created_at")
      .or(`id.eq.${jobId},job_id.eq.${jobId}`)
      .limit(1)
      .maybeSingle();

    if (loadErr) {
      console.error("[ingest/callback] failed to load product_ingestions", loadErr.message || loadErr);
      return NextResponse.json({ ok: false, error: "db_error", detail: loadErr.message || String(loadErr) }, { status: 500 });
    }

    if (!existing) {
      console.warn("[ingest/callback] no product_ingestions row found for job_id=", jobId);
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const currentAttempts = (existing as any).attempts_count || 0;
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
    const nowIso = new Date().toISOString();

    const updatePatch: any = {
      diagnostics: updatedDiagnostics,
      attempts_count: currentAttempts + 1,
      last_error: body.error || null,
      updated_at: nowIso,
    };

    if (body.normalized_payload) {
      updatePatch.normalized_payload = body.normalized_payload;
      updatePatch.status = nextStatus;
      updatePatch.completed_at = nowIso;
    } else {
      // Still update status if it indicates failure
      if (nextStatus && nextStatus !== "completed") updatePatch.status = nextStatus;
    }

    const { error: updErr } = await supabase
      .from("product_ingestions")
      .update(updatePatch)
      .eq("id", existing.id);

    if (updErr) {
      console.error("[ingest/callback] failed to update product_ingestions", updErr.message || updErr, {
        jobId,
        ingestionId: existing.id,
      });
      return NextResponse.json(
        { ok: false, error: "db_update_failed", detail: updErr.message || String(updErr) },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("POST /api/v1/ingest/callback error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "internal_error" },
      { status: 500 }
    );
  }
}
