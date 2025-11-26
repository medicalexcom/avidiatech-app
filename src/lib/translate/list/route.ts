import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * GET /api/translate/list
 * Returns recent product_ingestions for the UI to list.
 * NOTE: This returns the most recent rows across tenants; you should scope by tenant_id
 * (or the user's tenant) in production.
 */
export async function GET(req: Request) {
  try {
    const { userId } = auth() as any;
    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const supabase = getServiceSupabaseClient();

    // TODO: restrict by tenant_id for multi-tenant setups if you have it available in auth/session
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
