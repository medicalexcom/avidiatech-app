import { createClient } from "@supabase/supabase-js";
import { resolveSkuToUrl } from "@/lib/match/resolve";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export async function processMatchUrlJob(jobId: string) {
  // load job header
  const { data: job } = await supabaseAdmin.from("match_url_jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job) throw new Error("job not found");
  await supabaseAdmin.from("match_url_jobs").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", jobId);

  const tenantId = job.tenant_id;
  const batchSize = 25;
  let offset = 0;
  let anyErrors = false;
  let stats = { resolved: 0, review: 0, unresolved: 0, errors: 0 };

  while (true) {
    const { data: rows } = await supabaseAdmin
      .from("match_url_job_rows")
      .select("*")
      .eq("job_id", jobId)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(batchSize)
      .offset(offset);

    if (!rows || rows.length === 0) break;

    for (const r of rows) {
      try {
        await supabaseAdmin.from("match_url_job_rows").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", r.id);
        const res = await resolveSkuToUrl({
          tenantId: tenantId,
          supplierName: r.supplier_name,
          supplierKey: r.supplier_key ?? (r.supplier_name ?? "").toLowerCase().replace(/\s+/g,"_"),
          sku: r.sku,
          ndcItemCode: r.ndc_item_code,
          productName: r.product_name,
          brandName: r.brand_name
        });
        const update:any = { updated_at: new Date().toISOString() };
        if (res.status === "resolved_confident") {
          update.status = "resolved_confident";
          update.resolved_url = res.resolved_url;
          update.resolved_domain = (res.resolved_url ? new URL(res.resolved_url).hostname : null);
          update.confidence = res.confidence ?? 1;
          update.matched_by = res.matched_by ?? "resolver";
          update.reasons = res.signals ? JSON.stringify(res.signals) : JSON.stringify([]);
          stats.resolved++;
        } else if (res.status === "resolved_needs_review") {
          update.status = "resolved_needs_review";
          update.candidates = JSON.stringify(res.candidates ?? []);
          stats.review++;
        } else {
          update.status = "unresolved";
          update.candidates = JSON.stringify(res.candidates ?? []);
          stats.unresolved++;
        }
        await supabaseAdmin.from("match_url_job_rows").update(update).eq("id", r.id);
      } catch (err:any) {
        anyErrors = true;
        stats.errors++;
        await supabaseAdmin.from("match_url_job_rows").update({ status: "error", error_message: String(err?.message ?? err), updated_at: new Date().toISOString() }).eq("id", r.id);
      }
    }

    // simple pagination; break when less than batch size
    if (rows.length < batchSize) break;
    offset += batchSize;
  }

  // update job summary
  const finalStatus = anyErrors && (stats.resolved+stats.review+stats.unresolved>0) ? "partial" : anyErrors ? "failed" : "succeeded";
  await supabaseAdmin.from("match_url_jobs").update({
    status: finalStatus,
    input_count: (job.input_count || 0),
    resolved_count: (stats.resolved || 0),
    review_count: (stats.review || 0),
    unresolved_count: (stats.unresolved || 0),
    error_count: (stats.errors || 0),
    updated_at: new Date().toISOString()
  }).eq("id", jobId);

  return { ok: true, stats, status: finalStatus };
}
