// src/app/api/debug/whoami/route.ts
import { NextResponse, NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    // Get clerk auth from the incoming request
    const auth = safeGetAuth(req as any) as any;
    // Also call is_support_agent so we see rpc behavior
    let isAgent = null;
    try {
      const supabase = getServerSupabase();
      const { data } = await supabase.rpc("is_support_agent", { user_id: auth?.userId ?? null });
      isAgent = data;
    } catch (e) {
      // capture rpc error
      isAgent = { rpc_error: String(e) };
    }

    return NextResponse.json({ auth, isAgent });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
