import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySignature } from "@/lib/ingest/signature";
import {
  normalizeToAvidiaStandardFromCallback,
  type IngestCallbackBody,
} from "@/lib/ingest/avidiaStandard";

const INGEST_SECRET = process.env.INGEST_SECRET || "";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Use service role for callback so it can always update product_ingestions regardless of RLS.
function getCallbackSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function safeKeys(obj: any): string[] {
  if (!obj || typeof obj !== "object") return [];
  try {
    return Object.keys(obj);
  } catch {
    return [];
  }
}

function capAnyText(v: any, maxLen: number) {
  if (v === null || v === undefined) return null;
  const s = String(v);
  if (!s.trim()) return null;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function makeRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      route: "ingest_callback",
      ingest_secret_configured: Boolean(INGEST_SECRET),
      supabase_configured: Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY),
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  const requestId = makeRequestId();

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-avidiatech-signature") || "";

    // High-signal operational log (no secrets)
    console.info("[ingest_callback] received", {
      requestId,
      hasSignature: Boolean(signature),
      signatureLen: signature?.length ?? 0,
      rawBodyLen: rawBody?.length ?? 0,
    });

    if (!INGEST_SECRET) {
      console.error("[ingest_callback] INGEST_SECRET not configured on callback", { requestId });
      return NextResponse.json(
        { error: "server_misconfigured", detail: "INGEST_SECRET missing", requestId },
        { status: 500 }
      );
    }

    const valid = verifySignature(rawBody, signature, INGEST_SECRET);
    if (!valid) {
      console.warn("[ingest_callback] invalid signature", {
        requestId,
        signatureLen: signature?.length ?? 0,
        bodyPreview: (rawBody || "").slice(0, 500),
      });
      return NextResponse.json({ error: "invalid_signature", requestId }, { status: 401 });
    }

    let body: IngestCallbackBody;

    try {
      body = JSON.parse(rawBody || "{}");
    } catch (e: any) {
      console.warn("[ingest_callback] invalid_json", { requestId, error: String(e?.message || e) });
      return NextResponse.json(
        { error: "invalid_json", detail: String(e?.message || e), requestId },
        { status: 400 }
      );
    }

    const jobId = body.job_id;
    if (!jobId) {
      console.warn("[ingest_callback] missing job_id", { requestId, bodyKeys: safeKeys(body) });
      return NextResponse.json({ error: "missing_job_id", requestId }, { status: 400 });
    }

    const supabase = getCallbackSupabase();
    if (!supabase) {
      console.error("[ingest_callback] supabase_not_configured", { requestId });
      return NextResponse.json(
        {
          error: "supabase_not_configured",
          detail: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
          requestId,
        },
        { status: 500 }
      );
    }

    // Load existing row for diagnostics merging
    const { data: existing, error: loadErr } = await supabase
      .from("product_ingestions")
      .select(
        "id, status, diagnostics, attempts_count, last_error, created_at, job_id, source_url, ingest_callback_at, ingest_engine_status, ingest_callback_request_id"
      )
      .or(`id.eq.${jobId},job_id.eq.${jobId}`)
      .limit(1)
      .maybeSingle();

    if (loadErr) {
      console.error("[ingest_callback] failed to load product_ingestions", {
        requestId,
        jobId,
        error: loadErr.message || loadErr,
      });
      return NextResponse.json(
        { error: "db_error", detail: loadErr.message || String(loadErr), requestId },
        { status: 500 }
      );
    }

    if (!existing) {
      console.warn("[ingest_callback] no product_ingestions row found", { requestId, jobId });
      return NextResponse.json({ error: "not_found", requestId }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const currentAttempts = (existing as any).attempts_count || 0;
    const existingDiagnostics = (existing.diagnostics as any) || {};

    // Normalize from ANY bucket into canonical avidia_standard
    const normalization = normalizeToAvidiaStandardFromCallback({
      sourceUrl: (existing as any).source_url || null,
      callbackBody: body,
    });

    // Always record that callback was received (even if normalized payload is missing/invalid)
    const callbackDiagnosticsBase: any = {
      ...(existingDiagnostics.ingest_callback || {}),
      request_id: requestId,
      last_callback_at: nowIso,
      status: body.status || "completed",
      error: body.error || null,
      raw_diagnostics: body.diagnostics || null,
      callback_top_level_keys: safeKeys(body),
      payload_bucket_keys: {
        normalized_payload: safeKeys(body.normalized_payload),
        specs_payload: safeKeys(body.specs_payload),
        manuals_payload: safeKeys(body.manuals_payload),
        variants_payload: safeKeys(body.variants_payload),
        raw_payload: safeKeys(body.raw_payload),
      },
      // small previews for debugging (avoid huge diagnostics)
      payload_previews: {
        normalized_payload: capAnyText(JSON.stringify(body.normalized_payload ?? null), 4000),
        specs_payload: capAnyText(JSON.stringify(body.specs_payload ?? null), 4000),
        raw_payload: capAnyText(JSON.stringify(body.raw_payload ?? null), 4000),
      },
      normalized_validation: {
        ok: normalization.issues.length === 0,
        issues: normalization.issues,
        extracted: normalization.extracted,
        validated_at: nowIso,
      },
    };

    const updatedDiagnostics: any = {
      ...existingDiagnostics,
      ingest_callback: callbackDiagnosticsBase,
    };

    const engineReportedStatus = body.status || "completed";
    const inferredEngineStatus = normalization.normalized ? engineReportedStatus : "error";

    const updatePatch: any = {
      diagnostics: updatedDiagnostics,

      // Durable callback markers (preferred by polling / pipeline gating)
      ingest_callback_at: nowIso,
      ingest_callback_request_id: requestId,
      ingest_engine_status: inferredEngineStatus,
      ingest_callback_payload: {
        request_id: requestId,
        received_at: nowIso,
        status: engineReportedStatus,
        error: body.error || null,
        callback_top_level_keys: safeKeys(body),
        payload_bucket_keys: callbackDiagnosticsBase.payload_bucket_keys,
        payload_previews: callbackDiagnosticsBase.payload_previews,
        normalized_validation: callbackDiagnosticsBase.normalized_validation,
      },

      attempts_count: currentAttempts + 1,
      updated_at: nowIso,
      completed_at: nowIso,
      last_error: body.error || null,
    };

    if (normalization.normalized) {
      // Persist canonical normalized payload
      updatePatch.normalized_payload = normalization.normalized;

      // Keep legacy status updated (even if some other process uses it)
      updatePatch.status = engineReportedStatus;
    } else {
      // Do NOT overwrite normalized_payload with unusable placeholder data.
      // Mark as error to prevent SEO/Describe from hallucinating.
      updatePatch.status = "error";
      updatePatch.last_error = "ingest_invalid_normalized_payload";

      updatePatch.error = {
        code: "ingest_invalid_normalized_payload",
        message:
          "Callback payload lacked grounded name/specs in any recognized field blocks; refusing to persist invalid normalized_payload.",
        issues: normalization.issues,
        extracted: normalization.extracted,
      };
    }

    const { error: updErr } = await supabase
      .from("product_ingestions")
      .update(updatePatch)
      .eq("id", existing.id);

    if (updErr) {
      console.error("[ingest_callback] failed to update product_ingestions", {
        requestId,
        jobId,
        ingestionId: existing.id,
        error: updErr.message || updErr,
      });
      return NextResponse.json(
        { error: "db_update_failed", detail: updErr.message || String(updErr), requestId },
        { status: 500 }
      );
    }

    console.info("[ingest_callback] persisted", {
      requestId,
      jobId,
      ingestionId: existing.id,
      inferredEngineStatus,
    });

    return NextResponse.json({ ok: true, requestId }, { status: 200 });
  } catch (err: any) {
    console.error("[ingest_callback] unexpected error", { requestId, error: err?.message ?? err });
    return NextResponse.json(
      { error: err?.message || "internal_error", requestId },
      { status: 500 }
    );
  }
}
