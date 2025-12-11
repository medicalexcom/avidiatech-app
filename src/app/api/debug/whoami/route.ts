import { NextResponse, NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    // safeGetAuth should read the Clerk session from the incoming request cookies
    const auth = safeGetAuth(req as any) as any;

    // call is_support_agent RPC (wrap in try/catch so we still return auth if RPC fails)
    let isAgent = null;
    try {
      const supabase = getServerSupabase();
      const { data, error } = await supabase.rpc("is_support_agent", { user_id: auth?.userId ?? null });
      if (error) isAgent = { rpc_error: String(error?.message ?? error) };
      else isAgent = data;
    } catch (e) {
      isAgent = { rpc_error: String(e) };
    }

    return NextResponse.json({ auth, isAgent });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
