import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { computePrice } from "@/lib/price/computePrice";
import { resolvePricingProfile } from "@/lib/price/profile";

export const runtime = "nodejs";

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as any;
    const ingestionId = String(body?.ingestionId ?? "").trim();
    if (!ingestionId || !isUuid(ingestionId)) {
      return NextResponse.json({ ok: false, error: "missing_or_invalid_ingestionId" }, { status: 400 });
    }

    const source = (body?.source ?? "ui").toString();
    const mode = (body?.mode ?? "suggest").toString();
    if (!["monitor", "suggest", "auto"].includes(mode)) {
      return NextResponse.json({ ok: false, error: "invalid_mode" }, { status: 400 });
    }

    const input = body?.input ?? {};
    const cost = input?.cost;
    const currency = (input?.currency ?? "USD").toString();

    const supabase = getServiceSupabaseClient();

    // Load ingestion
    const { data: ing, error: ingErr } = await supabase
      .from("product_ingestions")
      .select("id, tenant_id, cost_input, supplier_price_input, pricing_profile_id, pricing_result, store_price")
      .eq("id", ingestionId)
      .maybeSingle();

    if (ingErr) return NextResponse.json({ ok: false, error: "ingestion_load_failed", detail: ingErr.message }, { status: 500 });
    if (!ing) return NextResponse.json({ ok: false, error: "ingestion_not_found" }, { status: 404 });

    const tenantId = (ing as any).tenant_id;
    if (!tenantId) return NextResponse.json({ ok: false, error: "missing_tenant_id" }, { status: 409 });

    // Load pricing profile if requested
    const profileFromDbId = body?.profile?.profileId ?? body?.profileId ?? null;
    const inlineOverrides = (body?.profile && typeof body.profile === "object") ? body.profile : null;

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

    const profileIdToUse =
      (typeof profileFromDbId === "string" && isUuid(profileFromDbId) ? profileFromDbId : null) ??
      ((ing as any).pricing_profile_id ? String((ing as any).pricing_profile_id) : null);

    if (profileIdToUse) {
      const { data: prof, error: profErr } = await supabase
        .from("pricing_profiles")
        .select("id, tenant_id, enabled, mode, value, rounding, include_shipping_buffer, shipping_buffer, min_price, max_price, min_margin, rules")
        .eq("id", profileIdToUse)
        .maybeSingle();

      if (profErr) {
        return NextResponse.json({ ok: false, error: "profile_load_failed", detail: profErr.message }, { status: 500 });
      }
      if (prof) {
        // basic ownership check
        if (String((prof as any).tenant_id) !== String(tenantId)) {
          return NextResponse.json({ ok: false, error: "profile_not_owned_by_tenant" }, { status: 403 });
        }
        baseProfile = prof as any;
      }
    }

    const resolvedProfile = resolvePricingProfile({
      base: baseProfile,
      overrides: inlineOverrides,
    });

    const computation = computePrice({
      input: { cost, currency },
      profile: resolvedProfile,
    });

    // Persist calc row (always)
    const calcInsert = {
      tenant_id: tenantId,
      ingestion_id: ingestionId,
      source,
      mode,
      input: { cost, currency },
      profile_snapshot: { ...resolvedProfile, profile_id: profileIdToUse ?? null },
      result: computation.result,
      explain: computation.explain,
      status: computation.result.blocked ? "blocked" : "computed",
      error: null,
      created_at: new Date().toISOString(),
    };

    const { data: calcRow, error: calcErr } = await supabase
      .from("price_calculations")
      .insert(calcInsert)
      .select("id")
      .maybeSingle();

    if (calcErr) {
      return NextResponse.json({ ok: false, error: "calc_insert_failed", detail: calcErr.message }, { status: 500 });
    }

    // Best-effort: update ingestion with latest pricing preview + cost_input + selected mode
    // (non-breaking if these columns don't exist yet—migration adds them)
    await supabase
      .from("product_ingestions")
      .update({
        cost_input: typeof cost === "number" ? cost : (typeof cost === "string" ? Number(cost) : null),
        pricing_profile_id: profileIdToUse ?? (ing as any).pricing_profile_id ?? null,
        pricing_result: computation.result,
        price_mode: mode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ingestionId);

    return NextResponse.json(
      {
        ok: true,
        calcId: calcRow?.id ?? null,
        pricingResult: computation.result,
        explain: computation.explain,
        warnings: computation.result.warnings ?? [],
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("POST /api/v1/price/compute error", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
