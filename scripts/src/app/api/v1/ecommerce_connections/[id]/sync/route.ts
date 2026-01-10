import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/v1/ecommerce_connections/:id/sync
 *
 * Minimal "enqueue" endpoint:
 * - Verifies the connection row exists in ecommerce_connections
 * - Updates updated_at timestamp so the UI can observe activity
 * - Returns { ok: true, jobId } where jobId is a generated UUID
 *
 * Note: This does not run a real long-running sync job. Replace the body with
 * a call to your background job queue (e.g. RQ, Bull, Temporal, Cloud Tasks, etc.)
 * when you add that infra.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE environment variables for ecommerce sync route");
}

const supaAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function genJobId() {
  if (typeof (globalThis as any).crypto?.randomUUID === "function") {
    try {
      return (globalThis as any).crypto.randomUUID();
    } catch {
      // fall through
    }
  }
  // fallback
  return `job_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

export async function POST(_req: Request, ctx: any) {
  // robustly get id param
  let params = ctx?.params;
  if (params && typeof params.then === "function") params = await params;
  const id = params?.id;
  if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

  try {
    // Verify connection exists
    const { data: conn, error: fetchErr } = await supaAdmin
      .from("ecommerce_connections")
      .select("id, tenant_id, platform, status")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr) {
      console.error("[ecommerce_connections/sync] fetch error:", fetchErr.message);
      // still return 500 to client
      return NextResponse.json({ ok: false, error: "db_fetch_failed", detail: fetchErr.message }, { status: 500 });
    }

    if (!conn) {
      return NextResponse.json({ ok: false, error: "not_found", detail: "connection not found" }, { status: 404 });
    }

    // Generate job id and update updated_at (safe operation even if updated_at is managed by DB)
    const jobId = genJobId();
    const now = new Date().toISOString();

    const { error: updErr } = await supaAdmin
      .from("ecommerce_connections")
      .update({ updated_at: now })
      .eq("id", id);

    if (updErr) {
      console.warn("[ecommerce_connections/sync] update updated_at error:", updErr.message);
      // non-fatal for enqueue semantics; still proceed to return job id
    }

    // TODO: enqueue real sync job here (push jobId + conn info to queue)
    // Example: await enqueueSyncJob({ jobId, connectionId: id, tenantId: conn.tenant_id })

    return NextResponse.json({ ok: true, jobId }, { status: 200 });
  } catch (e: any) {
    console.error("[ecommerce_connections/sync] exception:", String(e?.message ?? e));
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
