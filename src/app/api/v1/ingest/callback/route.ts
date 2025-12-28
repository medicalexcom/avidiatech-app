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

async function loadIngestionRow(supabase: any, jobId: string) {
  // Prefer ID match first (jobId is typically the ingestion row id).
  // Fallback to job_id match for older rows.
  const q = supabase
    .from("product_ingestions")
    .select(
      "id, status, diagnostics, attempts_count, last_error, created_at, job_id, source_url, completed_at, updated_at"
    )
    .or(`id.eq.${jobId},job_id.eq.${jobId}`)
    .limit(1);

  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data;
}

async function persistAndVerify(supabase: any, ingestionId: string, patch: any, expectedCallbackAt: string) {
  const { error: updErr } = await supabase
    .from("product_ingestions")
    .update(patch)
    .eq("id", ingestionId);

  if (updErr) throw updErr;

  // Verify: diagnostics marker must exist and must match this callback timestamp.
  const { data: check, error: chkErr } = await supabase
    .from("product_ingestions")
    .select("id, status, completed_at, diagnostics, last_error, error")
    .eq("id", ingestionId)
    .maybeSingle();

  if (chkErr) throw chkErr;

  const lastCallbackAt =
    (check?.diagnostics as any)?.ingest_callback?.last_callback_at ?? null;

  const ok =
    typeof lastCallbackAt === "string" && lastCallbackAt === expectedCallbackAt;

  return { ok, check };
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

    const existing = await loadIngestionRow(supabase, jobId);
    if (!existing) {
      console.warn("[ingest_callback] ingestion not found for job", { requestId, jobId });
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const currentAttempts = (existing as any).attempts_count || 0;
    const existingDiagnostics = (existing.diagnostics as any) || {};

    // Build ingest_callback diagnostic block (authoritative marker)
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
      payload_previews: {
        normalized_payload: capAnyText(JSON.stringify(body.normalized_payload ?? null), 4000),
        specs_payload: capAnyText(JSON.stringify(body.specs_payload ?? null), 4000),
      },
    };

    const updatedDiagnostics: any = {
      ...existingDiagnostics,
      ingest_callback: callbackDiagnosticsBase,
    };

    // Normalize from ANY bucket into canonical avidia_standard
    const normalization = normalizeToAvidiaStandardFromCallback({
      sourceUrl: (existing as any).source_url || null,
      callbackBody: body,
    });

    updatedDiagnostics.ingest_callback.normalized_validation = {
      ok: normalization.issues.length === 0,
      issues: normalization.issues,
      extracted: normalization.extracted,
      validated_at: nowIso,
    };

    const nextStatus = body.status || "completed";

    // IMPORTANT: ensure callback is terminal (never leave processing once callback is received)
    const patch: any = {
      diagnostics: updatedDiagnostics,
      attempts_count: currentAttempts + 1,
      updated_at: nowIso,
      completed_at: nowIso,
    };

    if (normalization.normalized) {
      patch.normalized_payload = normalization.normalized;
      patch.status = nextStatus; // typically "completed"
      patch.last_error = body.error || null;
      patch.error = body.error ? { message: body.error } : null;
    } else {
      patch.status = "error";
      patch.last_error = "ingest_invalid_normalized_payload";
      patch.error = {
        code: "ingest_invalid_normalized_payload",
        message:
          "Callback payload lacked grounded name/specs in any recognized field blocks; refusing to persist invalid normalized_payload.",
        issues: normalization.issues,
        extracted: normalization.extracted,
      };
    }

    // Persist + verify. If verification fails, retry once (covers lost update / concurrent clobber).
    const first = await persistAndVerify(supabase, existing.id, patch, nowIso);

    if (!first.ok) {
      console.warn("[ingest_callback] verification failed, retrying once", {
        requestId,
        ingestionId: existing.id,
        expectedCallbackAt: nowIso,
        gotCallbackAt:
          (first.check?.diagnostics as any)?.ingest_callback?.last_callback_at ?? null,
        gotStatus: first.check?.status ?? null,
      });

      const second = await persistAndVerify(supabase, existing.id, patch, nowIso);

      if (!second.ok) {
        console.error("[ingest_callback] verification failed after retry", {
          requestId,
          ingestionId: existing.id,
          expectedCallbackAt: nowIso,
          gotCallbackAt:
            (second.check?.diagnostics as any)?.ingest_callback?.last_callback_at ?? null,
          gotStatus: second.check?.status ?? null,
        });

        // At this point, return 500 so the engine logs show failure clearly.
        return NextResponse.json(
          {
            error: "callback_persist_verification_failed",
            requestId,
          },
          { status: 500 }
        );
      }
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
