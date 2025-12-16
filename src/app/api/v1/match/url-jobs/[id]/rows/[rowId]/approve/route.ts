import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
// Relative import to avoid alias resolution issues in some build configurations.
// Adjust the number of ../ segments if your file location differs.
import { indexFromIngestion } from "../../../../../../../../lib/match/indexFromIngestion";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env missing");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function POST(req: Request, context: any) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    // params
    let params = context?.params ?? null;
    if (params && typeof params.then === "function") params = await params;
    const jobId = params?.id;
    const rowId = params?.rowId;
    if (!jobId || !rowId) return NextResponse.json({ ok: false, error: "jobId and rowId required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const approvedUrl = (body?.approved_url ?? "").toString().trim();
    if (!approvedUrl) return NextResponse.json({ ok: false, error: "approved_url required" }, { status: 400 });

    // fetch row
    const { data: row } = await supabaseAdmin
      .from("match_url_job_rows")
      .select("*")
      .eq("job_id", jobId)
      .eq("row_id", rowId)
      .maybeSingle();

    if (!row) return NextResponse.json({ ok: false, error: "row not found" }, { status: 404 });

    const tenantId = row.tenant_id;

    // Upsert into product_source_index using indexFromIngestion helper
    try {
      await indexFromIngestion({
        tenant_id: tenantId,
        supplier_key: row.supplier_key ?? (row.supplier_name ?? "").toString().toLowerCase().replace(/\s+/g, "_"),
        supplier_name: row.supplier_name ?? null,
        sku: row.sku ?? null,
        sku_norm: row.sku_norm ?? null,
        ndc_item_code: row.ndc_item_code ?? null,
        ndc_item_code_norm: row.ndc_item_code_norm ?? null,
        product_name: row.product_name ?? null,
        brand_name: row.brand_name ?? null,
        source_url: approvedUrl,
        source_ingestion_id: null,
        confidence: 0.95,
        signals: { approved_by: userId, method: "manual:approve" }
      });
    } catch (err) {
      console.warn("index upsert failed:", err);
      // continue — still update the job row
    }

    // update the job row to resolved_confident
    const now = new Date().toISOString();
    const updatePayload: any = {
      status: "resolved_confident",
      resolved_url: approvedUrl,
      resolved_domain: (() => {
        try { return new URL(approvedUrl).hostname; } catch { return null; }
      })(),
      confidence: 0.95,
      matched_by: "manual:approved",
      candidates: [],
      reasons: ["approved_by_user"],
      error_code: null,
      error_message: null,
      updated_at: now
    };
    const { error: updateErr } = await supabaseAdmin
      .from("match_url_job_rows")
      .update(updatePayload)
      .eq("job_id", jobId)
      .eq("row_id", rowId);

    if (updateErr) {
      console.error("failed to update job row:", updateErr);
      return NextResponse.json({ ok: false, error: updateErr.message ?? String(updateErr) }, { status: 500 });
    }

    // Optionally increment job resolved_count
    try {
      const { data: job } = await supabaseAdmin
        .from("match_url_jobs")
        .select("id,resolved_count,input_count")
        .eq("id", jobId)
        .maybeSingle();
      if (job) {
        const newResolved = (Number(job.resolved_count ?? 0) + 1);
        await supabaseAdmin.from("match_url_jobs").update({ resolved_count: newResolved, updated_at: now }).eq("id", jobId);
      }
    } catch (err) {
      console.warn("failed to update job counters:", err);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("approve route error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
