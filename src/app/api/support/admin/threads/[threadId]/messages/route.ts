 url=https://github.com/medicalexcom/avidiatech-app/blob/main/src/app/api/support/admin/threads/[threadId]/messages/route.ts
import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

/**
 * GET: list messages for a thread (admin)
 * POST: create agent message (admin)
 */
export async function GET(req: Request, { params }: { params: { threadId: string } }) {
  try {
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServerSupabase();
    const { data: agentCheck } = await supabase.rpc("is_support_agent", { user_id: userId });
    if (!agentCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data, error } = await supabase.from("chat_messages").select("*, chat_files(*)").eq("thread_id", params.threadId).order("created_at", { ascending: true });
    if (error) {
      console.error("Error listing messages:", error);
      return NextResponse.json({ error: "Failed to list messages" }, { status: 500 });
    }

    return NextResponse.json({ messages: data ?? [] });
  } catch (err: any) {
    console.error("Admin messages GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { threadId: string } }) {
  try {
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServerSupabase();
    const { data: agentCheck } = await supabase.rpc("is_support_agent", { user_id: userId });
    if (!agentCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { content, messageType = "text", internal = false, attachments = [] } = body;
    if (!content && (!attachments || attachments.length === 0)) return NextResponse.json({ error: "Missing content or attachments" }, { status: 400 });

    // Determine sender fields
    // If agent has a UUID in your system, this can be set; otherwise leave sender_id null and rely on user_ref in participants.
    const senderPayload: any = { thread_id: params.threadId, sender_role: "agent", message_type: messageType, content, metadata: { internal } };

    // Try to find the participant row for the agent to set sender_id when possible
    const { data: agentParticipants } = await supabase.from("chat_participants").select("*").eq("user_ref", userId).limit(1).maybeSingle();
    if (agentParticipants && agentParticipants.user_id) senderPayload.sender_id = agentParticipants.user_id;

    const { data: newMessage, error: insertErr } = await supabase.from("chat_messages").insert([senderPayload]).select().single();
    if (insertErr) {
      console.error("Error inserting agent message:", insertErr);
      return NextResponse.json({ error: "Failed to insert message" }, { status: 500 });
    }

    // Insert chat_files rows for attachments (if any). attachments expected to have storage_path, file_name, size, mime
    if (Array.isArray(attachments) && attachments.length > 0) {
      const fileInserts = attachments.map((a: any) => ({
        thread_id: params.threadId,
        message_id: newMessage.id,
        storage_path: a.storage_path,
        file_name: a.file_name,
        file_size: a.size || null,
        mime: a.mime || null,
        uploaded_by: userId,
      }));
      const { error: filesErr } = await supabase.from("chat_files").insert(fileInserts);
      if (filesErr) console.error("Error inserting chat_files for attachments:", filesErr);
    }

    return NextResponse.json({ message: newMessage });
  } catch (err: any) {
    console.error("Admin messages POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
