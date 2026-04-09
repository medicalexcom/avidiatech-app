import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { computePrice } from "@/lib/price/computePrice";
import { resolvePricingProfile } from "@/lib/price/profile";

export const runtime = "nodejs";

/**
 * POST /api/v1/pipeline/internal/price
 *
 * Internal pipeline module endpoint (optional MVP hook).
 * - Auth via x-pipeline-secret (PIPELINE_INTERNAL_SECRET)
 * - Computes price and stores price_calculations + updates product_ingestions.pricing_result
 * - Does NOT push to store (push is separate, by design)
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-pipeline-secret") || "";
  const expected = process.env.PIPELINE_INTERNAL_SECRET || "";

  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as any;
  const ingestionId = body?.ingestionId?.toString() || "";
  if (!ingestionId) return NextResponse.json({ ok: false, error: "missing_ingestionId" }, { status: 400 });

  const supabase = getServiceSupabaseClient();

  try {
    const { data: ing, error: ingErr } = await supabase
      .from("product_ingestions")
      .select("id, tenant_id, cost_input, pricing_profile_id")
      .eq("id", ingestionId)
      .maybeSingle();

    if (ingErr) return NextResponse.json({ ok: false, error: "ingestion_load_failed", detail: ingErr.message }, { status: 200 });
    if (!ing) return NextResponse.json({ ok: false, error: "ingestion_not_found" }, { status: 200 });

    const tenantId = (ing as any).tenant_id ?? null;
    if (!tenantId) return NextResponse.json({ ok: true, skipped: true, reason: "missing_tenant_id" }, { status: 200 });

    // Load profile from DB if present
    let baseProfile: any = {
      enabled: true,
      mode: "markup",
      value: 0,
      rounding: "none",
      include_shipping_buffer: false,
      shipping_buffer: 0,
      min_price: null,
      max_price: null,
      min_margin: null,
    };

    const profileId = (ing as any).pricing_profile_id ? String((ing as any).pricing_profile_id) : null;
    if (profileId) {
      const { data: prof } = await supabase
        .from("pricing_profiles")
        .select("id, tenant_id, enabled, mode, value, rounding, include_shipping_buffer, shipping_buffer, min_price, max_price, min_margin")
        .eq("id", profileId)
        .maybeSingle();
      if (prof && String((prof as any).tenant_id) === String(tenantId)) {
        baseProfile = prof as any;
      }
    }

    const resolvedProfile = resolvePricingProfile({ base: baseProfile, overrides: body?.profileOverrides ?? null });
    const computation = computePrice({ input: { cost: body?.cost ?? (ing as any).cost_input ?? null, currency: body?.currency ?? "USD" }, profile: resolvedProfile });

    const calcInsert = {
      tenant_id: tenantId,
      ingestion_id: ingestionId,
      source: "pipeline",
      mode: (body?.mode ?? "auto").toString(),
      input: { cost: body?.cost ?? (ing as any).cost_input ?? null, currency: body?.currency ?? "USD" },
      profile_snapshot: { ...resolvedProfile, profile_id: profileId ?? null },
      result: computation.result,
      explain: computation.explain,
      status: computation.result.blocked ? "blocked" : "computed",
      created_at: new Date().toISOString(),
    };

    const { data: calcRow } = await supabase
      .from("price_calculations")
      .insert(calcInsert)
      .select("id")
      .maybeSingle();

    await supabase
      .from("product_ingestions")
      .update({
        pricing_result: computation.result,
        price_mode: (body?.mode ?? "auto").toString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ingestionId);

    return NextResponse.json(
      {
        ok: true,
        ingestionId,
        calcId: calcRow?.id ?? null,
        pricingResult: computation.result,
        explain: computation.explain,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "price_internal_exception", detail: String(e?.message ?? e) }, { status: 200 });
  }
}
