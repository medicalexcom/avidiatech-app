// src/app/api/v1/price/evaluate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { evaluateFormulaString, calculatePriceLegacy } from "@/lib/pricing/evaluateFormula";
import { getServiceSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = body?.input ?? {};
  const formula = body?.formula ?? null;
  try {
    if (formula) {
      if (formula.type === "js" && formula.code) {
        const res = await evaluateFormulaString(formula.code, input, { timeoutMs: 100 });
        return NextResponse.json({ ok: true, result: res });
      } else if (formula.type === "legacy") {
        const price = calculatePriceLegacy(input);
        return NextResponse.json({ ok: true, result: { ok: true, price } });
      } else {
        return NextResponse.json({ ok: false, error: "unsupported_formula" }, { status: 400 });
      }
    }
    // if no formula provided, load storewide formula
    const supa = getServiceSupabaseClient();
    const { data } = await supa.from("settings").select("value").eq("key", "price_formula").is("tenant_id", null).maybeSingle();
    const value = data?.value ?? null;
    if (!value) return NextResponse.json({ ok: false, error: "no_store_formula" }, { status: 404 });
    if (value.type === "js") {
      const r = await evaluateFormulaString(value.code, input);
      return NextResponse.json({ ok: true, result: r });
    } else if (value.type === "legacy") {
      const p = calculatePriceLegacy(input);
      return NextResponse.json({ ok: true, result: { ok: true, price: p } });
    } else {
      return NextResponse.json({ ok: false, error: "unsupported_stored_formula" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
