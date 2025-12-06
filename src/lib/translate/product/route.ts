import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * GET /api/translate/product?productId=<uuid>
 * Returns normalized_payload for a product by id.
 *
 * Set TRANSLATE_ALLOW_PUBLIC=1 for temporary debug bypass of Clerk auth.
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth() as any;
    if (!userId && process.env.TRANSLATE_ALLOW_PUBLIC !== "1") {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");
    if (!productId) return NextResponse.json({ error: "missing productId" }, { status: 400 });

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("product_ingestions")
      .select("id, normalized_payload, source_url, created_at")
      .eq("id", productId)
      .single();

    if (error || !data) {
      console.error("translate:product supabase error", error);
      return NextResponse.json({ error: "product_not_found", detail: error?.message || null }, { status: 404 });
    }

    return NextResponse.json({ product: data.normalized_payload || {}, meta: { id: data.id, source_url: data.source_url, created_at: data.created_at } }, { status: 200 });
  } catch (err: any) {
    console.error("translate:product error", err);
    return NextResponse.json({ error: "internal_error", detail: String(err?.message || err) }, { status: 500 });
  }
}
