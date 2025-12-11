import { NextResponse, NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

/**
 * PATCH /api/support/admin/threads/[threadId]
 * Body: { status?, priority?, assigned_agent_id? }
 *
 * Note: use NextRequest and loose context typing to satisfy Next.js types.
 */
export async function PATCH(request: NextRequest, context: any) {
  try {
    const params = context?.params || {};
    const threadId = params.threadId;

    const { userId } = (safeGetAuth(request as any) as { userId?: string | null }) || {};
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServerSupabase();
    const { data: agentCheck } = await supabase.rpc("is_support_agent", { user_id: userId });
    if (!agentCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const updates: any = {};
    if (body.status) updates.status = body.status;
    if (body.priority) updates.priority = body.priority;
    if (body.assigned_agent_id !== undefined) updates.assigned_agent_id = body.assigned_agent_id;

    const { data: updated, error } = await supabase.from("chat_threads").update(updates).eq("id", threadId).select().single();
    if (error) {
      console.error("Error updating thread:", error);
      return NextResponse.json({ error: "Failed to update thread" }, { status: 500 });
    }

    return NextResponse.json({ thread: updated });
  } catch (err: any) {
    console.error("Admin update thread error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
