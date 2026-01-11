import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/** robust id extraction (matches existing bulk endpoints style) */
function extractId(request: NextRequest, context: any): string | null {
  const ctxId = context?.params?.id;
  if (ctxId) return String(ctxId);
  try {
    const url = new URL(request.url);
    const m = url.pathname.match(/\/api\/v1\/bulk\/([^/]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch {}
  return null;
}

export async function GET(request: NextRequest, context: any) {
  try {
    const bulkJobId = extractId(request, context);
    if (!bulkJobId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = getServiceSupabaseClient();

    // Pull job row for total (fast, canonical)
    const { data: job, error: jobErr } = await supabase
      .from("bulk_jobs")
      .select("id,total_items,completed_items,failed_items,status,updated_at")
      .eq("id", bulkJobId)
      .maybeSingle();

    if (jobErr) throw jobErr;
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Authoritative grouped counts from bulk_job_items
    const { data: items, error: itemsErr } = await supabase
      .from("bulk_job_items")
      .select("status")
      .eq("bulk_job_id", bulkJobId);

    if (itemsErr) throw itemsErr;

    const counts: Record<string, number> = {};
    for (const r of items ?? []) {
      const s = String((r as any).status ?? "unknown");
      counts[s] = (counts[s] || 0) + 1;
    }

    const total = Number(job.total_items ?? 0);
    const completed = Number(job.completed_items ?? 0);
    const failed = Number(job.failed_items ?? 0);

    // Derive common statuses from items table (truth)
    const queued = Number(counts["queued"] ?? counts["pending"] ?? 0);
    const in_progress = Number(counts["in_progress"] ?? counts["running"] ?? 0);
    const succeeded = Number(counts["succeeded"] ?? 0);

    return NextResponse.json({
      ok: true,
      data: {
        bulkJobId,
        job_status: job.status ?? null,
        updated_at: job.updated_at ?? null,

        // prefer authoritative distribution if available
        total_items: total || (items?.length ?? 0),
        completed_items: completed || succeeded,
        failed_items: failed || Number(counts["failed"] ?? 0),

        queued_items: queued,
        in_progress_items: in_progress,

        // full breakdown
        counts_by_status: counts,
      },
    });
  } catch (err: any) {
    console.error("GET /api/v1/bulk/:id/stats error", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
