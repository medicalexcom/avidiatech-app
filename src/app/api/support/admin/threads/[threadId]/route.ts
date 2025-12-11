 url=https://github.com/medicalexcom/avidiatech-app/blob/main/src/app/api/support/admin/threads/[threadId]/route.ts
import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

/**
 * PATCH /api/support/admin/threads/[threadId]
 * Body: { status?, priority?, assigned_agent_id? }
 */
export async function PATCH(req: Request, { params }: { params: { threadId: string } }) {
  try {
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServerSupabase();
    const { data: agentCheck } = await supabase.rpc("is_support_agent", { user_id: userId });
    if (!agentCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const updates: any = {};
    if (body.status) updates.status = body.status;
    if (body.priority) updates.priority = body.priority;
    if (body.assigned_agent_id !== undefined) updates.assigned_agent_id = body.assigned_agent_id;

    const { data: updated, error } = await supabase.from("chat_threads").update(updates).eq("id", params.threadId).select().single();
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
