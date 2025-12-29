import { NextResponse } from "next/server";
import { runImportForIngestion } from "@/lib/imports/runImportForIngestion";

export async function POST(req: Request) {
  const secret = req.headers.get("x-pipeline-secret") || "";
  const expected = process.env.PIPELINE_INTERNAL_SECRET || "";

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as any;
  const ingestionId = body?.ingestionId?.toString() || "";
  const options = body?.options ?? {};

  if (!ingestionId) {
    return NextResponse.json({ error: "missing_ingestionId" }, { status: 400 });
  }

  try {
    const platform = (options?.platform ?? "bigcommerce") as "bigcommerce";
    const allowOverwriteExisting = Boolean(options?.allowOverwriteExisting);

    const result = await runImportForIngestion({
      ingestionId,
      platform,
      allowOverwriteExisting,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    const msg = err?.message || String(err);

    if (msg === "ingestion_not_found") return NextResponse.json({ error: "ingestion_not_found" }, { status: 404 });
    if (msg === "ingestion_not_ready") return NextResponse.json({ error: "ingestion_not_ready" }, { status: 409 });
    if (msg === "missing_tenant_id_for_import") return NextResponse.json({ error: "missing_tenant_id_for_import" }, { status: 422 });

    if (msg === "connection_not_found") return NextResponse.json({ error: "connection_not_found" }, { status: 409 });
    if (msg.startsWith("connection_load_failed:"))
      return NextResponse.json({ error: "connection_load_failed", detail: msg }, { status: 500 });

    if (msg === "bigcommerce_connection_incomplete")
      return NextResponse.json({ error: "bigcommerce_connection_incomplete" }, { status: 409 });

    if (msg.startsWith("bigcommerce_"))
      return NextResponse.json({ error: "bigcommerce_error", detail: msg }, { status: 502 });

    if (msg.startsWith("import_persist_failed:"))
      return NextResponse.json({ error: "import_persist_failed", detail: msg }, { status: 500 });

    return NextResponse.json({ error: "import_internal_failed", detail: msg }, { status: 500 });
  }
}
