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

  const params =
    (ctx as any)?.params && typeof (ctx as any).params.then === "function"
      ? await (ctx as any).params
      : (ctx as any).params;

  const ingestionId = params?.id;
  if (!ingestionId) return NextResponse.json({ ok: false, error: "missing_ingestion_id" }, { status: 400 });

  const { data: row, error } = await supabase
    .from("product_ingestions")
    .select("id, source_url, seo_payload, description_html, features, seo_generated_at, diagnostics")
    .eq("id", ingestionId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: "db_query_failed", detail: error.message }, { status: 500 });
  }
  if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const diagnostics = (row as any).diagnostics ?? {};
  const seoDiag = diagnostics?.seo ?? null;

  return NextResponse.json(
    {
      ok: true,
      ingestionId,
      source_url: (row as any).source_url ?? null,
      seo_generated_at: (row as any).seo_generated_at ?? null,
      seo_payload: (row as any).seo_payload ?? null,
      description_html: (row as any).description_html ?? null,
      features: (row as any).features ?? [],
      diagnostics: { seo: seoDiag },
    },
    { status: 200 }
  );
}
