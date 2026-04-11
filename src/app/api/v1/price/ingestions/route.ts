import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * GET /api/v1/price/ingestions
 * Lists recent ingestions for the pricing workspace.
 *
 * This mirrors the "translate list" approach but includes pricing fields.
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? 25) || 25));

    const supabase = getServiceSupabaseClient();

    const { data, error } = await supabase
      .from("product_ingestions")
      .select("id, tenant_id, source_url, created_at, updated_at, cost_input, pricing_result, store_price, price_mode")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ ok: false, error: "db_error", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ingestions: data ?? [] }, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/v1/price/ingestions error", err);
    return NextResponse.json({ ok: false, error: "internal_error", detail: String(err?.message ?? err) }, { status: 500 });
  }
}
