// POST /api/v1/ingest/:id/reprocess
// Allows running selected modules on an existing job using saved raw_payload (no re-scrape)
// This endpoint updates job.flags and options and asks the ingestion engine to run modules
//
// Auth:
// - Clerk user session (UI)
// - OR pipeline secret (service-to-service), header: x-pipeline-secret
//
// Policy:
// - If includeSeo=true then includeSpecs MUST be true (strict downstream compliance)

import { NextResponse, type NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { signPayload } from "@/lib/ingest/signature";

const INGEST_ENGINE_URL = process.env.INGEST_ENGINE_URL || "";
const INGEST_SECRET = process.env.INGEST_SECRET || "";
const APP_URL =
  process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const PIPELINE_INTERNAL_SECRET = process.env.PIPELINE_INTERNAL_SECRET || "";

function normalizeBool(v: any): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

function enforceOptionsInvariants(opts: any) {
  const o = { ...(opts || {}) };

  o.includeSeo = normalizeBool(o.includeSeo);
  o.includeSpecs = normalizeBool(o.includeSpecs);
  o.includeDocs = normalizeBool(o.includeDocs);
  o.includeVariants = normalizeBool(o.includeVariants);

  // HARD RULE: SEO requires specs
  if (o.includeSeo) o.includeSpecs = true;

  return o;
}

function hasPipelineAuth(req: NextRequest): boolean {
  const secret = req.headers.get("x-pipeline-secret") || "";
  if (!PIPELINE_INTERNAL_SECRET) return false;
  return secret === PIPELINE_INTERNAL_SECRET;
}

export async function POST(req: NextRequest, context: { params?: any }) {
  try {
    const pipelineAuthed = hasPipelineAuth(req);

    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    const clerkAuthed = !!userId;

    if (!pipelineAuthed && !clerkAuthed) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const id = context?.params?.id;
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    if (!INGEST_ENGINE_URL || !INGEST_SECRET) {
      return NextResponse.json({ error: "ingest_engine_not_configured" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedOptions = enforceOptionsInvariants(body?.options || {});
    const runNowFlags = {
      includeSeo: !!requestedOptions.includeSeo,
      includeSpecs: !!requestedOptions.includeSpecs,
      includeDocs: !!requestedOptions.includeDocs,
      includeVariants: !!requestedOptions.includeVariants,
    };

    if (!runNowFlags.includeSeo && !runNowFlags.includeSpecs && !runNowFlags.includeDocs && !runNowFlags.includeVariants) {
      return NextResponse.json({ error: "no_modules_requested" }, { status: 400 });
    }

    let supabase;
    try {
      supabase = getServiceSupabaseClient();
    } catch (err: any) {
      console.error("Supabase configuration missing", err?.message || err);
      return NextResponse.json({ error: "server_misconfigured_supabase" }, { status: 500 });
    }

    const { data: job, error: fetchErr } = await supabase
      .from("product_ingestions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !job) {
      console.warn("job not found", { id, fetchErr });
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // NOTE: this table currently doesn't have raw_payload; keep this logic for forward compat.
    const hasRaw = !!(job as any).raw_payload;

    const newFlags = {
      ...((job as any).flags || {}),
      ...runNowFlags,
      full_extract: false,
    };

    const nowIso = new Date().toISOString();

    await supabase
      .from("product_ingestions")
      .update({ flags: newFlags, options: { ...((job as any).options || {}), ...runNowFlags }, updated_at: nowIso })
      .eq("id", id);

    const payload: any = {
      action: "reprocess",
      job_id: id,
      tenant_id: (job as any).tenant_id || null,
      options: runNowFlags,
      callback_url: `${APP_URL}/api/v1/ingest/callback`,
      correlation_id: (job as any).correlation_id || null,
    };

    if (hasRaw) {
      payload.raw_payload = (job as any).raw_payload;
    } else {
      payload.url = (job as any).source_url;
    }

    const reprocessUrl = INGEST_ENGINE_URL.replace(/\/$/, "") + "/reprocess";

    const signature = signPayload(JSON.stringify(payload), INGEST_SECRET);

    try {
      const existingDiagnostics = (job as any).diagnostics || {};
      await supabase
        .from("product_ingestions")
        .update({
          diagnostics: {
            ...existingDiagnostics,
            reprocess_request: {
              requested_at: nowIso,
              requested_by: pipelineAuthed ? "pipeline" : "user",
              user_id: pipelineAuthed ? null : userId,
              options: runNowFlags,
            },
          },
          updated_at: nowIso,
        })
        .eq("id", id);
    } catch (e) {
      console.warn("[reprocess] failed to persist reprocess_request diagnostics", e);
    }

    try {
      const res = await fetch(reprocessUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-avidiatech-signature": signature,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => "");

      if (!res.ok) {
        console.warn("ingest engine reprocess responded non-OK", res.status, text);
        return NextResponse.json(
          { jobId: id, status: "reprocess_failed", engineStatus: res.status, engineBody: text },
          { status: 202 }
        );
      }

      return NextResponse.json({ jobId: id, status: "reprocess_started" }, { status: 202 });
    } catch (err) {
      console.error("failed to call ingest engine for reprocess", err);
      return NextResponse.json({ jobId: id, status: "reprocess_failed", error: String(err) }, { status: 500 });
    }
  } catch (err: any) {
    console.error("POST /api/v1/ingest/:id/reprocess error:", err);
    return NextResponse.json({ error: err.message || "internal_error" }, { status: 500 });
  }
}
