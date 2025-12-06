import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * GET /api/translate/list
 * Returns recent product_ingestions for the UI to list.
 *
 * For quick debugging you can set TRANSLATE_ALLOW_PUBLIC=1 to bypass Clerk session check.
 * Remove or set to 0 for production.
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth() as any;
    if (!userId && process.env.TRANSLATE_ALLOW_PUBLIC !== "1") {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const supabase = getServiceSupabaseClient();

    const { data, error } = await supabase
      .from("product_ingestions")
      .select("id, source_url, created_at")
      .order("created_at", { ascending: false })
      .limit(25);

    if (error) {
      console.error("translate:list supabase error", error);
      return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data || [] }, { status: 200 });
  } catch (err: any) {
    console.error("translate:list error", err);
    return NextResponse.json({ error: "internal_error", detail: String(err?.message || err) }, { status: 500 });
  }
}
