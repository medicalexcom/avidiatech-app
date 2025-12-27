import { NextResponse, type NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { verifySignature } from "@/lib/ingest/signature";

const INGEST_SECRET = process.env.INGEST_SECRET || "";

export async function GET() {
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

async function logEvent(args: {
  ok: boolean;
  reason: string;
  hasSignature: boolean;
  rawLen: number;
  jobId?: string | null;
  status?: string | null;
}) {
  try {
    const supabase = getServiceSupabaseClient();
    await supabase.from("ingest_callback_events").insert({
      ok: args.ok,
      reason: args.reason,
      has_signature: args.hasSignature,
      raw_len: args.rawLen,
      job_id: args.jobId ?? null,
      status: args.status ?? null,
    });
  } catch {
    // never block callback on logging failure
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-avidiatech-signature") || "";
  const hasSignature = Boolean(signature);

  if (!INGEST_SECRET) {
    await logEvent({
      ok: false,
      reason: "ingest_secret_missing",
      hasSignature,
      rawLen: rawBody?.length ?? 0,
    });
    return NextResponse.json(
      { ok: false, error: "server_misconfigured", detail: "INGEST_SECRET missing" },
      { status: 500 }
    );
  }

  const valid = verifySignature(rawBody, signature, INGEST_SECRET);
  if (!valid) {
    await logEvent({
      ok: false,
      reason: "invalid_signature",
      hasSignature,
      rawLen: rawBody?.length ?? 0,
    });
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let body: any = null;
  try {
    body = JSON.parse(rawBody || "{}");
  } catch {
    await logEvent({
      ok: false,
      reason: "invalid_json",
      hasSignature,
      rawLen: rawBody?.length ?? 0,
    });
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const jobId = body?.job_id ? String(body.job_id) : "";
  if (!jobId) {
    await logEvent({
      ok: false,
      reason: "missing_job_id",
      hasSignature,
      rawLen: rawBody?.length ?? 0,
    });
    return NextResponse.json({ ok: false, error: "missing job_id" }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();

  const { data: existing, error: loadErr } = await supabase
    .from("product_ingestions")
    .select("id, status, diagnostics, attempts_count, last_error, created_at")
    .or(`id.eq.${jobId},job_id.eq.${jobId}`)
    .limit(1)
    .maybeSingle();

  if (loadErr) {
    await logEvent({
      ok: false,
      reason: "db_load_failed",
      hasSignature,
      rawLen: rawBody?.length ?? 0,
      jobId,
      status: body?.status ?? null,
    });
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  if (!existing) {
    await logEvent({
      ok: false,
      reason: "ingestion_row_not_found",
      hasSignature,
      rawLen: rawBody?.length ?? 0,
      jobId,
      status: body?.status ?? null,
    });
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const currentAttempts = (existing as any).attempts_count || 0;
  const existingDiagnostics = (existing.diagnostics as any) || {};

  const callbackDiagnostics = {
    ...(existingDiagnostics.ingest_callback || {}),
    last_callback_at: new Date().toISOString(),
    status: body?.status || "completed",
    error: body?.error || null,
    raw_diagnostics: body?.diagnostics || null,
  };

  const updatedDiagnostics = {
    ...existingDiagnostics,
    ingest_callback: callbackDiagnostics,
  };

  const nextStatus = body?.status || "completed";
  const nowIso = new Date().toISOString();

  const updatePatch: any = {
    diagnostics: updatedDiagnostics,
    attempts_count: currentAttempts + 1,
    last_error: body?.error || null,
    updated_at: nowIso,
  };

  if (body?.normalized_payload) {
    updatePatch.normalized_payload = body.normalized_payload;
    updatePatch.status = nextStatus;
    updatePatch.completed_at = nowIso;
  } else {
    if (nextStatus && nextStatus !== "completed") updatePatch.status = nextStatus;
  }

  const { error: updErr } = await supabase
    .from("product_ingestions")
    .update(updatePatch)
    .eq("id", existing.id);

  if (updErr) {
    await logEvent({
      ok: false,
      reason: `db_update_failed:${updErr.message || String(updErr)}`,
      hasSignature,
      rawLen: rawBody?.length ?? 0,
      jobId,
      status: body?.status ?? null,
    });
    return NextResponse.json({ ok: false, error: "db_update_failed" }, { status: 500 });
  }

  await logEvent({
    ok: true,
    reason: "ok",
    hasSignature,
    rawLen: rawBody?.length ?? 0,
    jobId,
    status: body?.status ?? null,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
