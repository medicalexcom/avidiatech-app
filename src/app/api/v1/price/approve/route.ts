import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

function toNumber(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.trim().replace(/^\$/, "");
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as any;
    const calcId = String(body?.calcId ?? "").trim();
    if (!calcId) return NextResponse.json({ ok: false, error: "missing_calcId" }, { status: 400 });

    const supabase = getServiceSupabaseClient();

    const { data: calc, error: calcErr } = await supabase
      .from("price_calculations")
      .select("id, tenant_id, ingestion_id, status, result, mode")
      .eq("id", calcId)
      .maybeSingle();

    if (calcErr) return NextResponse.json({ ok: false, error: "calc_load_failed", detail: calcErr.message }, { status: 500 });
    if (!calc) return NextResponse.json({ ok: false, error: "calc_not_found" }, { status: 404 });

    const result = (calc as any).result ?? {};
    const storePrice = toNumber(result?.storePrice);

    if (!storePrice || storePrice <= 0) {
      return NextResponse.json({ ok: false, error: "invalid_store_price_on_calc", detail: { storePrice } }, { status: 409 });
    }
    if (result?.blocked) {
      return NextResponse.json({ ok: false, error: "calc_blocked_cannot_approve", detail: result?.blockReason ?? null }, { status: 409 });
    }

    // Update ingestion.store_price
    const { error: updErr } = await supabase
      .from("product_ingestions")
      .update({
        store_price: storePrice,
        updated_at: new Date().toISOString(),
      })
      .eq("id", (calc as any).ingestion_id);

    if (updErr) return NextResponse.json({ ok: false, error: "ingestion_update_failed", detail: updErr.message }, { status: 500 });

    // Update calc status
    const { error: statusErr } = await supabase
      .from("price_calculations")
      .update({ status: "approved" })
      .eq("id", calcId);

    if (statusErr) return NextResponse.json({ ok: false, error: "calc_update_failed", detail: statusErr.message }, { status: 500 });

    return NextResponse.json(
      { ok: true, calcId, ingestionId: (calc as any).ingestion_id, storePrice },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("POST /api/v1/price/approve error", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
