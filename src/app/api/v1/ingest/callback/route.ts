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

function supabaseHost() {
  try {
    return SUPABASE_URL ? new URL(SUPABASE_URL).host : null;
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      route: "ingest_callback",
      ingest_secret_configured: Boolean(INGEST_SECRET),
      supabase_configured: Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY),
      supabase_url_host: supabaseHost(),
      vercel_env: process.env.VERCEL_ENV ?? null,
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

    if (!INGEST_SECRET) {
      console.error("[ingest_callback] INGEST_SECRET not configured", { requestId });
      return NextResponse.json(
        { error: "server_misconfigured", detail: "INGEST_SECRET missing" },
        { status: 500 }
      );
    }

    const valid = verifySignature(rawBody, signature, INGEST_SECRET);
    if (!valid) {
      console.warn("[ingest_callback] invalid signature", { requestId });
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    let body: IngestCallbackBody;
    try {
      body = JSON.parse(rawBody || "{}");
    } catch (e: any) {
      return NextResponse.json(
        { error: "invalid_json", detail: String(e?.message || e) },
        { status: 400 }
      );
    }

    const jobId = body.job_id;
    if (!jobId) return NextResponse.json({ error: "missing job_id" }, { status: 400 });

    const supabase = getCallbackSupabase();
    if (!supabase) {
      return NextResponse.json(
        {
          error: "supabase_not_configured",
          detail: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        },
        { status: 500 }
      );
    }

    // Load existing row for diagnostics merging
    const { data: existing, error: loadErr } = await supabase
      .from("product_ingestions")
      .select("id, status, diagnostics, attempts_count, last_error, created_at, job_id, source_url")
      .or(`id.eq.${jobId},job_id.eq.${jobId}`)
      .limit(1)
      .maybeSingle();

    if (loadErr) {
      console.error("[ingest_callback] failed to load product_ingestions", {
        requestId,
        message: loadErr.message || String(loadErr),
      });
      return NextResponse.json(
        { error: "db_error", detail: loadErr.message || String(loadErr) },
        { status: 500 }
      );
    }

    if (!existing) {
      console.warn("[ingest_callback] no product_ingestions row found for job_id", { requestId, jobId });
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const currentAttempts = (existing as any).attempts_count || 0;
    const existingDiagnostics = (existing.diagnostics as any) || {};

    // Normalize from ANY bucket into canonical avidia_standard
    const normalization = normalizeToAvidiaStandardFromCallback({
      sourceUrl: (existing as any).source_url || null,
      callbackBody: body,
    });

    // Build trimmed payload snapshot for DB column (stable, small, easy to query)
    const trimmedPayloadSnapshot: any = {
      request_id: requestId,
      job_id: jobId,
      received_at: nowIso,
      status: body.status || "completed",
      error: body.error || null,
      callback_top_level_keys: safeKeys(body),
      payload_bucket_keys: {
        normalized_payload: safeKeys(body.normalized_payload),
        specs_payload: safeKeys(body.specs_payload),
        manuals_payload: safeKeys(body.manuals_payload),
        variants_payload: safeKeys(body.variants_payload),
        raw_payload: safeKeys(body.raw_payload),
      },
      payload_previews: {
        normalized_payload: capAnyText(JSON.stringify(body.normalized_payload ?? null), 4000),
        specs_payload: capAnyText(JSON.stringify(body.specs_payload ?? null), 4000),
      },
      normalized_validation: {
        ok: normalization.issues.length === 0,
        issues: normalization.issues,
        extracted: normalization.extracted,
        validated_at: nowIso,
      },
    };

    // Also keep JSON diagnostics for humans (but pipeline gating will use ingest_callback_at)
    const updatedDiagnostics: any = {
      ...existingDiagnostics,
      ingest_callback: {
        ...(existingDiagnostics.ingest_callback || {}),
        ...trimmedPayloadSnapshot,
        last_callback_at: nowIso,
      },
    };

    const nextStatus = body.status || "completed";

    const updatePatch: any = {
      diagnostics: updatedDiagnostics,
      ingest_callback_at: nowIso,
      ingest_callback_request_id: requestId,
      ingest_callback_payload: trimmedPayloadSnapshot,
      ingest_engine_status: normalization.normalized ? nextStatus : "error",
      attempts_count: currentAttempts + 1,
      updated_at: nowIso,
      completed_at: nowIso,
    };

    if (normalization.normalized) {
      updatePatch.normalized_payload = normalization.normalized;
      updatePatch.status = nextStatus;
      updatePatch.last_error = body.error || null;
      updatePatch.error = body.error ? { message: body.error } : null;
    } else {
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
        message: updErr.message || String(updErr),
      });
      return NextResponse.json(
        { error: "db_update_failed", detail: updErr.message || String(updErr) },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, requestId }, { status: 200 });
  } catch (err: any) {
    console.error("POST /api/v1/ingest/callback error:", err);
    return NextResponse.json(
      { error: err?.message || "internal_error" },
      { status: 500 }
    );
  }
}
