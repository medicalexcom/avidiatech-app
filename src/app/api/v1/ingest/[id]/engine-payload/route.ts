import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function safeKeys(obj: any): string[] {
  if (!obj || typeof obj !== "object") return [];
  try {
    return Object.keys(obj);
  } catch {
    return [];
  }
}

function counts(payload: any) {
  const specsCount = payload?.specs && typeof payload.specs === "object" ? Object.keys(payload.specs).length : 0;
  const featuresCount = Array.isArray(payload?.features_raw) ? payload.features_raw.length : 0;
  const imagesCount = Array.isArray(payload?.images) ? payload.images.length : 0;
  const tabsCount = Array.isArray(payload?.tabs) ? payload.tabs.length : 0;
  return { specsCount, featuresCount, imagesCount, tabsCount };
}

function summarizeEnginePayload(payload: any) {
  const c = counts(payload);
  const topKeys = safeKeys(payload);

  return {
    top_level_keys: topKeys,
    counts: c,
    headline: {
      source: payload?.source ?? null,
      name_raw: payload?.name_raw ?? null,
      brand: payload?.brand ?? null,
      sku: payload?.sku ?? null,
    },
    // lightweight previews (safe, small)
    images_preview: Array.isArray(payload?.images)
      ? payload.images.slice(0, 8).map((x: any) => ({ url: x?.url ?? null }))
      : [],
    tabs_preview: Array.isArray(payload?.tabs)
      ? payload.tabs.slice(0, 12).map((t: any) => ({ title: t?.title ?? null }))
      : [],
    features_preview: Array.isArray(payload?.features_raw) ? payload.features_raw.slice(0, 12) : [],
    specs_preview: payload?.specs && typeof payload.specs === "object"
      ? Object.fromEntries(Object.entries(payload.specs).slice(0, 20))
      : null,
  };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase_not_configured", detail: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 }
    );
  }

  const params =
    (ctx as any)?.params && typeof (ctx as any).params.then === "function"
      ? await (ctx as any).params
      : (ctx as any).params;

  const ingestionId = params?.id;
  if (!ingestionId) return NextResponse.json({ ok: false, error: "missing_ingestion_id" }, { status: 400 });

  const url = new URL(req.url);
  const mode = String(url.searchParams.get("mode") ?? "").toLowerCase(); // "" | "summary"

  // Look up engine_payload_ref stored on the ingestion row
  const { data: row, error: rowErr } = await supabase
    .from("product_ingestions")
    .select("id, engine_payload_ref, engine_payload_sha256")
    .eq("id", ingestionId)
    .maybeSingle();

  if (rowErr) {
    return NextResponse.json({ ok: false, error: "db_query_failed", detail: rowErr.message }, { status: 500 });
  }
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const ref = (row as any).engine_payload_ref as string | null;
  if (!ref) return NextResponse.json({ ok: false, error: "engine_payload_ref_missing" }, { status: 409 });

  const bucket = process.env.INGEST_ENGINE_PAYLOADS_BUCKET || "ingest-engine-payloads";
  const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(ref);

  if (dlErr || !blob) {
    return NextResponse.json(
      { ok: false, error: "download_failed", detail: String(dlErr?.message ?? dlErr ?? "unknown"), bucket, ref },
      { status: 500 }
    );
  }

  const text = await blob.text();

  let payload: any;
  try {
    payload = JSON.parse(text);
  } catch {
    // if not json, only full mode can return raw
    if (mode === "summary") {
      return NextResponse.json(
        { ok: false, error: "payload_not_json", bucket, ref },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { ok: true, ingestionId, bucket, ref, sha256: (row as any).engine_payload_sha256 ?? null, error: "payload_not_json", raw: text },
      { status: 200 }
    );
  }

  if (mode === "summary") {
    return NextResponse.json(
      {
        ok: true,
        ingestionId,
        bucket,
        ref,
        sha256: (row as any).engine_payload_sha256 ?? null,
        summary: summarizeEnginePayload(payload),
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { ok: true, ingestionId, bucket, ref, sha256: (row as any).engine_payload_sha256 ?? null, payload },
    { status: 200 }
  );
}
