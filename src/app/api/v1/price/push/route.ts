import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { runImportForIngestion } from "@/lib/imports/runImportForIngestion";

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
      return NextResponse.json({ ok: false, error: "calc_blocked_cannot_push", detail: result?.blockReason ?? null }, { status: 409 });
    }

    // Enforce: must be approved OR calc.mode=auto (auto may be pushed without explicit approve)
    const status = String((calc as any).status ?? "");
    const mode = String((calc as any).mode ?? "");
    const eligible = status === "approved" || mode === "auto";
    if (!eligible) {
      return NextResponse.json({ ok: false, error: "calc_not_approved", detail: { status, mode } }, { status: 409 });
    }

    // Ensure ingestion has store_price set (payload builder will pick it up)
    const { data: ing, error: ingErr } = await supabase
      .from("product_ingestions")
      .select("id, tenant_id, store_price")
      .eq("id", (calc as any).ingestion_id)
      .maybeSingle();

    if (ingErr) return NextResponse.json({ ok: false, error: "ingestion_load_failed", detail: ingErr.message }, { status: 500 });
    if (!ing) return NextResponse.json({ ok: false, error: "ingestion_not_found" }, { status: 404 });

    if (!ing.store_price || Number(ing.store_price) !== storePrice) {
      const { error: setErr } = await supabase
        .from("product_ingestions")
        .update({ store_price: storePrice, updated_at: new Date().toISOString() })
        .eq("id", (calc as any).ingestion_id);
      if (setErr) return NextResponse.json({ ok: false, error: "ingestion_store_price_set_failed", detail: setErr.message }, { status: 500 });
    }

    // Run import with overwrite enabled (so existing SKU updates)
    const importRes = await runImportForIngestion({
      ingestionId: (calc as any).ingestion_id,
      platform: "bigcommerce",
      allowOverwriteExisting: true,
    });

    // Record history (best-effort; old price not fetched in MVP)
    await supabase.from("price_history").insert({
      tenant_id: (calc as any).tenant_id,
      store_connection_id: null,
      ingestion_id: (calc as any).ingestion_id,
      platform: "bigcommerce",
      product_id: (importRes as any)?.result?.product_id ? String((importRes as any).result.product_id) : null,
      variant_id: null,
      old_price: null,
      new_price: storePrice,
      reason: "push",
      calc_id: calcId,
      created_at: new Date().toISOString(),
    });

    // Update calc status to pushed if import ok
    const pushedOk = Boolean((importRes as any)?.result?.ok);
    await supabase
      .from("price_calculations")
      .update({
        status: pushedOk ? "pushed" : "failed",
        error: pushedOk ? null : { import: (importRes as any)?.result ?? null },
      })
      .eq("id", calcId);

    return NextResponse.json(
      {
        ok: true,
        calcId,
        ingestionId: (calc as any).ingestion_id,
        pushed: pushedOk,
        import: (importRes as any)?.result ?? null,
        storePrice,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("POST /api/v1/price/push error", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
