import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySignature } from "@/lib/ingest/signature";

const INGEST_SECRET = process.env.INGEST_SECRET || "";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Use service role for callback so it can always update product_ingestions regardless of RLS.
function getCallbackSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function looksUrlDerivedName(name: string) {
  const s = name.toLowerCase();
  return s.includes("http://") || s.includes("https://") || s.includes("www.") || s.includes("product for ");
}

function hasNonEmptySpecs(specs: any): boolean {
  if (!specs) return false;
  if (Array.isArray(specs)) return specs.length > 0;
  if (typeof specs === "object") return Object.keys(specs).length > 0;
  return false;
}

/**
 * Validate normalized_payload for strict downstream compliance.
 *
 * We do NOT invent missing values here.
 * If payload is incomplete (url-derived name or empty specs), we mark job as not-ready/failed
 * and persist diagnostics so operators (or auto-reprocess) can correct extraction.
 */
function validateNormalizedPayload(normalized: any): {
  ok: boolean;
  issues: Array<{ field: string; issue: string; fix_hint?: string }>;
} {
  const issues: Array<{ field: string; issue: string; fix_hint?: string }> = [];

  const name = normalized?.name ?? normalized?.name_raw ?? normalized?.product_name ?? null;
  if (!isNonEmptyString(name)) {
    issues.push({
      field: "normalized_payload.name",
      issue: "missing",
      fix_hint: "Ensure ingestion extracts a grounded product name from dom/json-ld/meta and passes it in normalized_payload.",
    });
  } else if (looksUrlDerivedName(String(name))) {
    issues.push({
      field: "normalized_payload.name",
      issue: "url_derived_or_placeholder",
      fix_hint: "Ensure ingestion does not set name to 'Product for <url>' and instead uses a grounded product title.",
    });
  }

  const specs = normalized?.specs ?? null;
  if (!hasNonEmptySpecs(specs)) {
    issues.push({
      field: "normalized_payload.specs",
      issue: "empty",
      fix_hint: "Ensure ingestion extracts specs (table/specs JSON-LD) and includes them in normalized_payload.specs.",
    });
  }

  return { ok: issues.length === 0, issues };
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
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-avidiatech-signature") || "";

    if (!INGEST_SECRET) {
      console.error("INGEST_SECRET not configured on callback");
      return NextResponse.json(
        { error: "server_misconfigured", detail: "INGEST_SECRET missing" },
        { status: 500 }
      );
    }

    const valid = verifySignature(rawBody, signature, INGEST_SECRET);
    if (!valid) {
      console.warn("ingest callback invalid signature");
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
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
      .select("id, status, diagnostics, attempts_count, last_error, created_at, job_id")
      .or(`id.eq.${jobId},job_id.eq.${jobId}`)
      .limit(1)
      .maybeSingle();

    if (loadErr) {
      console.error("ingest callback: failed to load product_ingestions", loadErr.message || loadErr);
      return NextResponse.json({ error: "db_error", detail: loadErr.message || String(loadErr) }, { status: 500 });
    }

    if (!existing) {
      console.warn("ingest callback: no product_ingestions row found for job_id=", jobId);
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const currentAttempts = (existing as any).attempts_count || 0;
    const existingDiagnostics = (existing.diagnostics as any) || {};

    const nowIso = new Date().toISOString();

    const callbackDiagnostics = {
      ...(existingDiagnostics.ingest_callback || {}),
      last_callback_at: nowIso,
      status: body.status || "completed",
      error: body.error || null,
      raw_diagnostics: body.diagnostics || null,
    };

    const updatedDiagnostics: any = {
      ...existingDiagnostics,
      ingest_callback: callbackDiagnostics,
    };

    const updatePatch: any = {
      diagnostics: updatedDiagnostics,
      attempts_count: currentAttempts + 1,
      last_error: body.error || null,
      updated_at: nowIso,
    };

    const nextStatus = body.status || "completed";

    // If engine provided normalized_payload, validate it before accepting.
    if (body.normalized_payload) {
      const validation = validateNormalizedPayload(body.normalized_payload);

      updatedDiagnostics.ingest_callback = {
        ...(updatedDiagnostics.ingest_callback || {}),
        normalized_validation: {
          ok: validation.ok,
          issues: validation.issues,
          validated_at: nowIso,
        },
      };

      if (!validation.ok) {
        // Do NOT overwrite normalized_payload with invalid placeholder data.
        // Mark ingestion as error so downstream modules (seo/audit/import) can treat it as not ready.
        updatePatch.status = "error";
        updatePatch.completed_at = nowIso;
        updatePatch.last_error = "ingest_invalid_normalized_payload";

        updatePatch.error = {
          code: "ingest_invalid_normalized_payload",
          message: "Callback provided normalized_payload missing grounded name/specs; refusing to persist invalid placeholders.",
          issues: validation.issues,
        };

        updatePatch.diagnostics = updatedDiagnostics;

        const { error: updErr } = await supabase
          .from("product_ingestions")
          .update(updatePatch)
          .eq("id", existing.id);

        if (updErr) {
          console.error("ingest callback: failed to update product_ingestions", updErr.message || updErr);
          return NextResponse.json({ error: "db_update_failed", detail: updErr.message || String(updErr) }, { status: 500 });
        }

        // Return 200 to avoid engine retry loops unless you explicitly want retries.
        return NextResponse.json(
          { ok: true, accepted: false, error: "ingest_invalid_normalized_payload", issues: validation.issues },
          { status: 200 }
        );
      }

      // Valid payload: accept and persist.
      updatePatch.normalized_payload = body.normalized_payload;
      updatePatch.status = nextStatus;
      updatePatch.completed_at = nowIso;
      updatePatch.diagnostics = updatedDiagnostics;
    } else {
      // No payload provided; just update status if it isn't completed
      if (nextStatus !== "completed") updatePatch.status = nextStatus;
      updatePatch.diagnostics = updatedDiagnostics;
    }

    const { error: updErr } = await supabase
      .from("product_ingestions")
      .update(updatePatch)
      .eq("id", existing.id);

    if (updErr) {
      console.error("ingest callback: failed to update product_ingestions", updErr.message || updErr);
      return NextResponse.json({ error: "db_update_failed", detail: updErr.message || String(updErr) }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("POST /api/v1/ingest/callback error:", err);
    return NextResponse.json({ error: err?.message || "internal_error" }, { status: 500 });
  }
}
