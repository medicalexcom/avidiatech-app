import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

function isUuid(s?: string) {
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export async function POST(req: Request) {
  try {
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { threadId, content, messageType, metadata } = body;
    if (!threadId || (messageType !== "file" && !content)) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const supabase = getServerSupabase();

    const { data: participants, error: participantsErr } = await supabase.from("chat_participants").select("*").eq("thread_id", threadId);
    if (participantsErr) {
      console.error("Error fetching participants:", participantsErr);
      return NextResponse.json({ error: "Failed to verify participant" }, { status: 500 });
    }

    const isParticipant = Array.isArray(participants) && participants.some((p: any) => {
      if (p.user_ref && p.user_ref === userId) return true;
      try { if (p.user_id && String(p.user_id) === userId) return true; } catch { }
      return false;
    });

    if (!isParticipant) return NextResponse.json({ error: "You are not a participant of this thread" }, { status: 403 });

    const participantRow = participants.find((p: any) => p.user_ref === userId || String(p.user_id) === userId) || participants[0];
    const senderRole = participantRow?.role === "agent" ? "agent" : (messageType === "system" ? "system" : "user");

    const insertPayload: any = { thread_id: threadId, sender_role: senderRole, message_type: messageType || "text", content: content ?? "", metadata: metadata ?? {} };
    if (participantRow?.user_id && isUuid(String(participantRow.user_id))) insertPayload.sender_id = participantRow.user_id;
    else insertPayload.sender_id = null;

    const { data: newMessage, error: insertErr } = await supabase.from("chat_messages").insert([insertPayload]).select().single();
    if (insertErr) {
      console.error("Message insert error:", insertErr);
      return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
    }

    try {
      if (participantRow?.user_ref) {
        await supabase.from("chat_participants").update({ last_read_at: new Date().toISOString() }).eq("thread_id", threadId).eq("user_ref", participantRow.user_ref);
      } else if (participantRow?.user_id && isUuid(String(participantRow.user_id))) {
        await supabase.from("chat_participants").update({ last_read_at: new Date().toISOString() }).eq("thread_id", threadId).eq("user_id", participantRow.user_id);
      }
    } catch (e) {
      console.error("Error updating last_read_at:", e);
    }

    return NextResponse.json({ message: newMessage });
  } catch (err: any) {
    console.error("Message creation error:", err);
    return NextResponse.json({ error: "Internal server error", details: String(err?.message ?? err) }, { status: 500 });
  }
}
