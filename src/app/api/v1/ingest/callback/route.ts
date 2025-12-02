// POST /api/v1/ingest/callback - ingestion engine calls back here with results
import { NextResponse, type NextRequest } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { verifySignature } from "@/lib/ingest/signature";

const INGEST_SECRET = process.env.INGEST_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get("x-avidiatech-signature") || "";
    const bodyText = await req.text();

    if (!verifySignature(bodyText, sig, INGEST_SECRET)) {
      console.warn("invalid ingest callback signature");
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    const body = JSON.parse(bodyText);
    const { job_id, correlation_id, status, normalized_payload, diagnostics, started_at } = body;

    if (!job_id) {
      return NextResponse.json({ error: "missing job_id" }, { status: 400 });
    }

    // Create supabase client lazily and using service role key (throws if misconfigured)
    let supabase;
    try {
      supabase = getServiceSupabaseClient();
    } catch (err: any) {
      console.error("Supabase configuration missing", err?.message || err);
      return NextResponse.json({ error: "server misconfigured: missing Supabase envs" }, { status: 500 });
    }

    // Build update payload defensively
    const updatePayload: any = {
      status: status || "completed",
      normalized_payload: normalized_payload ?? null,
      diagnostics: diagnostics ?? null,
      completed_at: new Date().toISOString(),
    };

    // If started_at is provided by engine, persist it (useful for debugging)
    if (started_at) updatePayload.started_at = started_at;

    // Also update attempts_count/last_attempt_at if diagnostics indicate retry count (defensive)
    try {
      // read existing attempts_count and diagnostics
      const { data: existing } = await supabase.from("product_ingestions").select("attempts_count, diagnostics").eq("id", job_id).single();
      const prevAttempts = (existing?.attempts_count || 0);
      updatePayload.attempts_count = prevAttempts + 1;
      updatePayload.last_attempt_at = new Date().toISOString();
    } catch (e) {
      // ignore read errors, still proceed with update
    }

    const { error } = await supabase.from("product_ingestions").update(updatePayload).eq("id", job_id);
    if (error) {
      console.error("failed to update product_ingestions from callback", error);
      return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
    }

    // Increment usage_counters and write usage_logs based on diagnostics or options.
    // For demo: increment ingest_calls
    try {
      const { data: ing } = await supabase.from("product_ingestions").select("tenant_id").eq("id", job_id).single();
      const tenant_id = ing?.tenant_id;
      if (tenant_id) {
        const month = new Date().toISOString().slice(0, 7);
        // Upsert: add one ingest call (simple approach). For production, use atomic increment SQL or tx.
        await supabase.from("usage_counters").upsert(
          { tenant_id, month, ingest_calls: 1 },
          { onConflict: "tenant_id" }
        );
        await supabase.from("usage_logs").insert({
          tenant_id,
          user_id: (body as any).user_id || null,
          product_ingestion_id: job_id,
          event: "ingest",
          payload: { correlation_id },
          count: 1,
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("usage increment failed", err);
    }

    console.info(`[ingest/callback] processed job_id=${job_id} status=${updatePayload.status}`);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("ingest callback error:", err);
    return NextResponse.json({ error: err.message || "internal_error" }, { status: 500 });
  }
}
