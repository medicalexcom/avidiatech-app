import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

/**
 * GET /api/support/admin/threads
 * Agent-only: lists threads with filters
 */
export async function GET(req: Request) {
  try {
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServerSupabase();

    // Verify agent via DB helper function: is_support_agent(user_id)
    const { data: agentCheck, error: agentErr } = await supabase.rpc("is_support_agent", { user_id: userId });
    if (agentErr || !agentCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const assigned = url.searchParams.get("assigned") || undefined; // my|unassigned|all
    const priority = url.searchParams.get("priority") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    let q = supabase.from("chat_threads").select("id,subject,tenant_id,status,priority,last_message_at,assigned_agent_id").order("last_message_at", { ascending: false });

    if (status) q = q.eq("status", status);
    if (priority) q = q.eq("priority", priority);
    if (assigned === "unassigned") q = q.is("assigned_agent_id", null);
    if (assigned === "my") q = q.eq("assigned_agent_id", userId);

    q = q.range(offset, offset + limit - 1);

    const { data, error } = await q;
    if (error) {
      console.error("Error listing admin threads:", error);
      return NextResponse.json({ error: "Failed to list threads" }, { status: 500 });
    }

    return NextResponse.json({ threads: data ?? [] });
  } catch (err: any) {
    console.error("Admin threads error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
