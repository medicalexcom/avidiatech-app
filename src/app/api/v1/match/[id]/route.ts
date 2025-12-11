import { NextResponse, NextRequest } from "next/server";
import { getCurrentTenantId } from "@/lib/auth";
import { getRowsForJob } from "@/lib/match/db";

export async function GET(req: NextRequest, context: { params: { id: string } | Promise<{ id: string }> }) {
  if (process.env.FEATURE_MATCH !== "true") {
    return NextResponse.json({ error: "feature-disabled" }, { status: 404 });
  }

  // context.params can be a Promise in newer Next types — await to support both shapes.
  const params = (await (context.params as any)) as { id: string };
  const jobId = params.id;

  const tenantId = getCurrentTenantId(req);
  const rows = await getRowsForJob(tenantId, jobId);
  const submitted = rows.length;
  const candidates = rows.filter((r) => r.status === "candidate").length;
  const failed = rows.filter((r) => r.status === "failed").length;

  return NextResponse.json({
    jobId,
    status: "completed",
    items: rows,
    metrics: { submitted, candidates, failed, durationMs: 0 },
  });
}
