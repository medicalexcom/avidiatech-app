import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const ingestionId = String(url.searchParams.get("ingestionId") ?? "").trim();
    if (!ingestionId) return NextResponse.json({ ok: false, error: "missing_ingestionId" }, { status: 400 });

    const supabase = getServiceSupabaseClient();

    const { data: ing, error: ingErr } = await supabase
      .from("product_ingestions")
      .select("id, tenant_id, store_price, pricing_result, price_mode, updated_at")
      .eq("id", ingestionId)
      .maybeSingle();

    if (ingErr) return NextResponse.json({ ok: false, error: "ingestion_load_failed", detail: ingErr.message }, { status: 500 });
    if (!ing) return NextResponse.json({ ok: false, error: "ingestion_not_found" }, { status: 404 });

    const tenantId = (ing as any).tenant_id;
    if (!tenantId) return NextResponse.json({ ok: false, error: "missing_tenant_id" }, { status: 409 });

    const { data: calcs, error: calcsErr } = await supabase
      .from("price_calculations")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("ingestion_id", ingestionId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (calcsErr) return NextResponse.json({ ok: false, error: "calcs_load_failed", detail: calcsErr.message }, { status: 500 });

    const { data: pushes, error: pushesErr } = await supabase
      .from("price_history")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("ingestion_id", ingestionId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (pushesErr) return NextResponse.json({ ok: false, error: "history_load_failed", detail: pushesErr.message }, { status: 500 });

    return NextResponse.json(
      {
        ok: true,
        ingestion: ing,
        calculations: calcs ?? [],
        history: pushes ?? [],
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("GET /api/v1/price/history error", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
