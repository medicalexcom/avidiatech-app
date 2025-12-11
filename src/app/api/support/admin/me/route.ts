import { NextRequest, NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) return NextResponse.json({ isAgent: false }, { status: 200 });

    const supabase = getServerSupabase();
    
    const { data: agentCheck, error: agentError } = await supabase.rpc("is_support_agent", { user_id: userId });
    if (agentError) {
      console.error("is_support_agent rpc error:", agentError);
      return NextResponse.json({ isAgent: false }, { status: 200 });
    }

    // Optionally fetch profile details (name/email)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (profileError) {
      console.error("profiles lookup error:", profileError);
    }

    return NextResponse.json(
      { isAgent: !!agentCheck, userId, name: profile?.full_name ?? null, email: profile?.email ?? null },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("admin/me error:", err);
    return NextResponse.json({ isAgent: false }, { status: 200 });
  }
}
