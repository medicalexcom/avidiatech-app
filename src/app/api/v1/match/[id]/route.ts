import { NextResponse } from "next/server";
import { getCurrentTenantId } from "@/lib/auth";
import { getRowsForJob } from "@/lib/match/db";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (process.env.FEATURE_MATCH !== "true") return NextResponse.json({ error: "feature-disabled" }, { status: 404 });
  const jobId = params.id;
  const tenantId = getCurrentTenantId(req);
  const rows = await getRowsForJob(tenantId, jobId);
  const submitted = rows.length;
  const candidates = rows.filter((r) => r.status === "candidate").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  return NextResponse.json({ jobId, status: "completed", items: rows, metrics: { submitted, candidates, failed, durationMs: 0 } });
}
