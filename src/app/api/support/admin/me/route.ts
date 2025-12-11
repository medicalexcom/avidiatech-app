import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    // Read clerk user id from incoming request (safeGetAuth reads cookies/context)
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) return NextResponse.json({ isAgent: false }, { status: 200 });

    const supabase = getServerSupabase();

    // Primary authorization check: DB RPC should return boolean for Clerk user_id (text).
    const { data: agentCheck, error } = await supabase.rpc("is_support_agent", { user_id: userId });
    if (error) {
      console.error("is_support_agent rpc error:", error);
      return NextResponse.json({ isAgent: false }, { status: 200 });
    }

    // Fetch profile by profiles.user_id (NOT the uuid id). Many schemas keep Clerk id in user_id column.
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, role, tenant_id, full_name, email")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      isAgent: !!agentCheck,
      userId,
      name: profile?.full_name ?? null,
      email: profile?.email ?? null,
      role: profile?.role ?? null,
    });
  } catch (err: any) {
    console.error("admin/me error:", err);
    return NextResponse.json({ isAgent: false }, { status: 200 });
  }
}
