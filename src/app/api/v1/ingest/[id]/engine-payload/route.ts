import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase_not_configured", detail: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 }
    );
  }

  const params = (ctx as any)?.params && typeof (ctx as any).params.then === "function"
    ? await (ctx as any).params
    : (ctx as any).params;

  const ingestionId = params?.id;
  if (!ingestionId) return NextResponse.json({ ok: false, error: "missing_ingestion_id" }, { status: 400 });

  // Look up engine_payload_ref stored on the ingestion row
  const { data: row, error: rowErr } = await supabase
    .from("product_ingestions")
    .select("id, engine_payload_ref, engine_payload_sha256")
    .eq("id", ingestionId)
    .maybeSingle();

  if (rowErr) {
    return NextResponse.json(
      { ok: false, error: "db_query_failed", detail: rowErr.message },
      { status: 500 }
    );
  }
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const ref = (row as any).engine_payload_ref as string | null;
  if (!ref) {
    return NextResponse.json(
      { ok: false, error: "engine_payload_ref_missing" },
      { status: 409 }
    );
  }

  const bucket = process.env.INGEST_ENGINE_PAYLOADS_BUCKET || "ingest-engine-payloads";
  const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(ref);

  if (dlErr || !blob) {
    return NextResponse.json(
      { ok: false, error: "download_failed", detail: String(dlErr?.message ?? dlErr ?? "unknown"), bucket, ref },
      { status: 500 }
    );
  }

  const text = await blob.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(
      { ok: true, ingestionId, bucket, ref, sha256: (row as any).engine_payload_sha256 ?? null, payload: json },
      { status: 200 }
    );
  } catch {
    // still return raw if somehow not JSON
    return NextResponse.json(
      { ok: true, ingestionId, bucket, ref, sha256: (row as any).engine_payload_sha256 ?? null, error: "payload_not_json", raw: text },
      { status: 200 }
    );
  }
}
