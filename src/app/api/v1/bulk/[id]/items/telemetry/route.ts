import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/** same robust id extraction */
function extractId(request: NextRequest, context: any): string | null {
  const ctxId = context?.params?.id;
  if (ctxId) return String(ctxId);
  try {
    const url = new URL(request.url);
    const m = url.pathname.match(/\/api\/v1\/bulk\/([^/]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch (e) {}
  return null;
}

type ModuleStatus = "queued" | "running" | "succeeded" | "failed" | "skipped" | string;

function summarizeModules(mods: Array<any>) {
  const counts: Record<string, number> = {};
  for (const m of mods) {
    const s = (m?.status ?? "unknown") as ModuleStatus;
    counts[s] = (counts[s] || 0) + 1;
  }

  const running = mods.find((m) => m?.status === "running") || null;
  const nextQueued = mods.find((m) => m?.status === "queued") || null;
  const failed = mods.find((m) => m?.status === "failed") || null;

  const current = running || failed || nextQueued || mods[0] || null;

  return {
    counts,
    current: current
      ? {
          module_index: current.module_index,
          module_name: current.module_name,
          status: current.status,
          started_at: current.started_at ?? null,
          finished_at: current.finished_at ?? null,
          error: current.error ?? null,
        }
      : null,
    failed: failed
      ? {
          module_index: failed.module_index,
          module_name: failed.module_name,
          status: failed.status,
          error: failed.error ?? null,
        }
      : null,
  };
}

export async function GET(request: NextRequest, context: any) {
  try {
    const bulkJobId = extractId(request, context);
    if (!bulkJobId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const url = new URL(request.url);
    const limit = Math.max(0, parseInt(url.searchParams.get("limit") || "200", 10) || 200);
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);

    const supabase = getServiceSupabaseClient();

    // 1) Fetch bulk items page
    let query: any = supabase
      .from("bulk_job_items")
      .select("*")
      .eq("bulk_job_id", bulkJobId)
      .order("item_index", { ascending: true });

    if (limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data: items, error: itemsErr } = await query;
    if (itemsErr) {
      console.error("bulk telemetry items fetch error", itemsErr);
      throw itemsErr;
    }

    const rows = items ?? [];
    const pipelineRunIds = Array.from(
      new Set(rows.map((r: any) => r.pipeline_run_id).filter(Boolean))
    ) as string[];

    // 2) Fetch pipeline_runs for those ids
    let pipelineRunsById: Record<string, any> = {};
    let moduleRunsByPipelineId: Record<string, any[]> = {};

    if (pipelineRunIds.length > 0) {
      const { data: runs, error: runsErr } = await supabase
        .from("pipeline_runs")
        .select("id,status,started_at,finished_at,metadata,created_at")
        .in("id", pipelineRunIds);

      if (runsErr) {
        console.error("bulk telemetry pipeline_runs fetch error", runsErr);
        throw runsErr;
      }

      for (const r of runs ?? []) pipelineRunsById[String(r.id)] = r;

      // 3) Fetch module_runs for those pipeline_run_ids
      const { data: mods, error: modsErr } = await supabase
        .from("module_runs")
        .select("pipeline_run_id,module_index,module_name,status,started_at,finished_at,error,output_ref")
        .in("pipeline_run_id", pipelineRunIds)
        .order("module_index", { ascending: true });

      if (modsErr) {
        console.error("bulk telemetry module_runs fetch error", modsErr);
        throw modsErr;
      }

      for (const m of mods ?? []) {
        const pid = String(m.pipeline_run_id);
        if (!moduleRunsByPipelineId[pid]) moduleRunsByPipelineId[pid] = [];
        moduleRunsByPipelineId[pid].push(m);
      }
    }

    // 4) Attach telemetry to each item
    const enriched = rows.map((it: any) => {
      const pipelineRunId = it.pipeline_run_id ? String(it.pipeline_run_id) : null;
      const run = pipelineRunId ? pipelineRunsById[pipelineRunId] ?? null : null;
      const mods = pipelineRunId ? moduleRunsByPipelineId[pipelineRunId] ?? [] : [];

      const moduleSummary = mods.length ? summarizeModules(mods) : null;

      return {
        ...it,
        telemetry: {
          pipeline_run: run
            ? {
                id: run.id,
                status: run.status,
                started_at: run.started_at ?? null,
                finished_at: run.finished_at ?? null,
                created_at: run.created_at ?? null,
              }
            : null,
          modules: mods.map((m) => ({
            module_index: m.module_index,
            module_name: m.module_name,
            status: m.status,
            started_at: m.started_at ?? null,
            finished_at: m.finished_at ?? null,
            error: m.error ?? null,
            output_ref: m.output_ref ?? null,
          })),
          module_summary: moduleSummary,
        },
      };
    });

    return NextResponse.json({
      ok: true,
      data: enriched,
      meta: {
        bulkJobId,
        limit,
        offset,
        returned: enriched.length,
        pipelineRunIds: pipelineRunIds.length,
      },
    });
  } catch (err: any) {
    console.error("GET /api/v1/bulk/:id/items/telemetry error", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
