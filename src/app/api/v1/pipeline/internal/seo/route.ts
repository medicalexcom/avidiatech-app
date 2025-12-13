import { NextResponse } from "next/server";
import { runSeoForIngestion } from "@/lib/seo/runSeoForIngestion";

export async function POST(req: Request) {
  const secret = req.headers.get("x-pipeline-secret") || "";
  const expected = process.env.PIPELINE_INTERNAL_SECRET || "";

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as any;
  const ingestionId = body?.ingestionId?.toString() || "";
  if (!ingestionId) return NextResponse.json({ error: "missing_ingestionId" }, { status: 400 });

  try {
    const result = await runSeoForIngestion(ingestionId);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    const msg = err?.message || String(err);

    if (msg === "ingestion_not_found") return NextResponse.json({ error: "ingestion_not_found" }, { status: 404 });
    if (msg === "ingestion_not_ready") return NextResponse.json({ error: "ingestion_not_ready" }, { status: 409 });

    return NextResponse.json({ error: "seo_internal_failed", detail: msg }, { status: 500 });
  }
}
