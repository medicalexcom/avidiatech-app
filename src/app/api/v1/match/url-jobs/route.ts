import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuth } from "@clerk/nextjs/server";
import { normalizeSupplierName, normalizeSku, normalizeNdcItemCode, normalizeProductName } from "@/lib/match/normalize";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function POST(req: Request) {
  try {
    const { userId, orgId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const tenantId = body.tenant_id ?? orgId ?? body.tenantId;
    if (!tenantId) return NextResponse.json({ ok: false, error: "tenant_id required" }, { status: 400 });

    const jobPayload:any = {
      tenant_id: tenantId,
      created_by: userId,
      status: "queued",
      source_type: body.source_type ?? "distributor_sheet",
      file_name: body.file_name ?? null,
      meta: body.meta ?? {},
      input_count: rows.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { data: job, error: jobErr } = await supabaseAdmin.from("match_url_jobs").insert([jobPayload]).select("*").maybeSingle();
    if (jobErr) throw jobErr;

    // insert rows (normalized)
    const inserts:any[] = [];
    for (let i=0;i<rows.length;i++) {
      const r = rows[i];
      const supplier_key = normalizeSupplierName(r.supplier_name ?? r.supplier ?? "");
      const sku_norm = normalizeSku(r.sku ?? "");
      const ndc_norm = normalizeNdcItemCode(r.ndc_item_code ?? r.ndc ?? "");
      const product_name_norm = normalizeProductName(r.product_name ?? r.name ?? "");
      inserts.push({
        job_id: job.id,
        tenant_id: tenantId,
        row_id: r.row_id ?? String(i+1),
        supplier_name: r.supplier_name ?? r.supplier ?? null,
        sku: r.sku ?? null,
        ndc_item_code: r.ndc_item_code ?? null,
        product_name: r.product_name ?? null,
        brand_name: r.brand_name ?? null,
        raw: r,
        supplier_key,
        sku_norm,
        ndc_item_code_norm: ndc_norm,
        product_name_norm
      });
    }

    if (inserts.length) {
      const { error: insErr } = await supabaseAdmin.from("match_url_job_rows").insert(inserts);
      if (insErr) console.warn("insert rows error:", insErr);
    }

    return NextResponse.json({ ok: true, job_id: job.id }, { status: 201 });
  } catch (err:any) {
    console.error("create job error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
