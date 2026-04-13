import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

async function safeCount(table: string, filter?: Record<string, string>): Promise<number> {
  try {
    let q = getServerSupabase().from(table).select("id", { count: "exact", head: true });
    if (filter) {
      for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
    }
    const res = await q;
    return (res as any)?.count ?? 0;
  } catch {
    return 0;
  }
}

async function safeCountWhere(table: string, col: string, val: string): Promise<number> {
  try {
    const res = await getServerSupabase()
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(col, val);
    return (res as any)?.count ?? 0;
  } catch {
    return 0;
  }
}

async function safeRecentRows(
  table: string,
  orderCol: string,
  limit: number,
  selectCols = "*"
): Promise<any[]> {
  try {
    const { data } = await getServerSupabase()
      .from(table)
      .select(selectCols)
      .order(orderCol, { ascending: false })
      .limit(limit);
    return data ?? [];
  } catch {
    return [];
  }
}

/**
 * GET /api/metrics
 * Comprehensive metrics across all pipeline modules.
 * Used by Dashboard home, Analytics, and Visualize pages.
 */
export async function GET() {
  try {
    // Run all counts in parallel for performance
    const [
      totalIngestions,
      ingestionsPending,
      ingestionsSuccess,
      ingestionsFailed,
      totalPipelineRuns,
      pipelineRunsSucceeded,
      pipelineRunsFailed,
      pipelineRunsRunning,
      totalImportJobs,
      importJobsCompleted,
      importJobsFailed,
      totalBulkJobs,
      bulkJobsCompleted,
      totalSeoRuns,
      totalDescribeRuns,
      totalMonitorWatches,
      totalMonitorEvents,
      recentIngestions,
      recentPipelineRuns,
      recentBulkJobs,
    ] = await Promise.all([
      safeCount("product_ingestions"),
      safeCountWhere("product_ingestions", "status", "pending"),
      safeCountWhere("product_ingestions", "status", "success"),
      safeCountWhere("product_ingestions", "status", "failed"),
      safeCount("pipeline_runs"),
      safeCountWhere("pipeline_runs", "status", "succeeded"),
      safeCountWhere("pipeline_runs", "status", "failed"),
      safeCountWhere("pipeline_runs", "status", "running"),
      safeCount("import_jobs"),
      safeCountWhere("import_jobs", "status", "completed"),
      safeCountWhere("import_jobs", "status", "failed"),
      safeCount("bulk_jobs"),
      safeCountWhere("bulk_jobs", "status", "completed"),
      safeCountWhere("product_ingestions", "export_type", "seo"),
      safeCountWhere("product_ingestions", "export_type", "describe"),
      safeCount("monitor_watches"),
      safeCount("monitor_events"),
      safeRecentRows(
        "product_ingestions",
        "created_at",
        10,
        "id,status,export_type,source_url,created_at"
      ),
      safeRecentRows(
        "pipeline_runs",
        "created_at",
        10,
        "id,status,created_at,finished_at"
      ),
      safeRecentRows("bulk_jobs", "created_at", 5, "id,status,total_items,completed_items,created_at"),
    ]);

    const successRate =
      totalPipelineRuns > 0
        ? Math.round((pipelineRunsSucceeded / totalPipelineRuns) * 100)
        : null;

    const importSuccessRate =
      totalImportJobs > 0
        ? Math.round((importJobsCompleted / totalImportJobs) * 100)
        : null;

    return NextResponse.json({
      ok: true,
      metrics: {
        // Ingestion
        ingestions: {
          total: totalIngestions,
          pending: ingestionsPending,
          success: ingestionsSuccess,
          failed: ingestionsFailed,
          seo_runs: totalSeoRuns,
          describe_runs: totalDescribeRuns,
        },
        // Pipeline
        pipeline: {
          total_runs: totalPipelineRuns,
          succeeded: pipelineRunsSucceeded,
          failed: pipelineRunsFailed,
          running: pipelineRunsRunning,
          success_rate: successRate,
        },
        // Import
        imports: {
          total: totalImportJobs,
          completed: importJobsCompleted,
          failed: importJobsFailed,
          success_rate: importSuccessRate,
        },
        // Bulk
        bulk: {
          total: totalBulkJobs,
          completed: bulkJobsCompleted,
        },
        // Monitor
        monitor: {
          watches: totalMonitorWatches,
          events: totalMonitorEvents,
        },
        // Recent activity
        recent: {
          ingestions: recentIngestions,
          pipeline_runs: recentPipelineRuns,
          bulk_jobs: recentBulkJobs,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
