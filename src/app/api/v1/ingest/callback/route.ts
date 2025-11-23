// POST /api/v1/ingest/callback - ingestion engine calls back here with results
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySignature } from "@/lib/ingest/signature";

const INGEST_SECRET = process.env.INGEST_SECRET || "";

function getSupabaseClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL || "";
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing Supabase configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get("x-avidiatech-signature") || "";
    const bodyText = await req.text();
    if (!verifySignature(bodyText, sig, INGEST_SECRET)) {
      console.warn("invalid ingest callback signature");
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    const body = JSON.parse(bodyText);
    const { job_id, correlation_id, status, normalized_payload, diagnostics } = body;

    if (!job_id) {
      return NextResponse.json({ error: "missing job_id" }, { status: 400 });
    }

    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (err: any) {
      console.error("Supabase configuration missing", err.message);
      return NextResponse.json({ error: "server misconfigured: missing Supabase envs" }, { status: 500 });
    }

    // Update product_ingestions record
    const updatePayload: any = {
      status: status || "success",
      normalized_payload: normalized_payload || null,
      diagnostics: diagnostics || null,
      completed_at: new Date().toISOString(),
    };

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
        await supabase.from("usage_counters").upsert(
          { tenant_id, month: new Date().toISOString().slice(0, 7), ingest_calls: 1 },
          { onConflict: "tenant_id" }
        );
        await supabase.from("usage_logs").insert({
          tenant_id,
          user_id: body.user_id || null,
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

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("ingest callback error:", err);
    return NextResponse.json({ error: err.message || "internal_error" }, { status: 500 });
  }
}
