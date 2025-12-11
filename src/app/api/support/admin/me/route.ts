import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const { userId } =
      (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId)
      return NextResponse.json({ isAgent: false }, { status: 200 });

    const supabase = getServerSupabase();
    const { data: agentCheck, error } = await supabase.rpc(
      "is_support_agent",
      { user_id: userId },
    );
    if (error) {
      console.error("is_support_agent rpc error:", error);
      return NextResponse.json({ isAgent: false }, { status: 200 });
    }

    // Optionally fetch profile details (name/email)
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    return NextResponse.json({
      isAgent: !!agentCheck,
      userId,
      name: profile?.full_name ?? null,
      email: profile?.email ?? null,
    });
  } catch (err: any) {
    console.error("admin/me error:", err);
    return NextResponse.json({ isAgent: false }, { status: 200 });
  }
}
