import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 });

    const body = await req.json();
    const { threadId, content, messageType, metadata } = body;
    if (!threadId || (messageType !== "file" && !content)) {
      return NextResponse.json({ error: "Missing required fields: threadId and content (for non-file messages)" }, { status: 400 });
    }

    const supabase = getServerSupabase();

    // Fetch participants for the thread, then check in JS so we don't attempt to cast Clerk id to uuid
    const { data: participants, error: participantsErr } = await supabase
      .from("chat_participants")
      .select("*")
      .eq("thread_id", threadId);

    if (participantsErr) {
      console.error("Error fetching participants:", participantsErr);
      return NextResponse.json({ error: "Failed to verify participant" }, { status: 500 });
    }

    const isParticipant = Array.isArray(participants) && participants.some((p: any) => {
      // Match by user_ref (text) OR by user_id (if stored as a uuid that stringifies to Clerk id — unlikely)
      if (p.user_ref && p.user_ref === userId) return true;
      try {
        if (p.user_id && String(p.user_id) === userId) return true;
      } catch {
        // ignore cast issues
      }
      return false;
    });

    // You can also allow support agents via DB helper (if implemented)
    // For now, deny if not participant
    if (!isParticipant) {
      return NextResponse.json({ error: "You are not a participant of this thread" }, { status: 403 });
    }

    // Determine sender role from participant row
    const participantRow = participants.find((p: any) => p.user_ref === userId || String(p.user_id) === userId) || participants[0];
    const senderRole = participantRow?.role === "agent" ? "agent" : (messageType === "system" ? "system" : "user");

    // Insert the message (existing behavior)
    const { data: msg, error: insertErr } = await supabase
      .from("chat_messages")
      .insert([{
        thread_id: threadId,
        sender_id: participantRow?.user_id ?? null,
        sender_role: senderRole,
        message_type: messageType || "text",
        content: content ?? "",
        metadata: metadata ?? {}
      }])
      .select()
      .single();

    if (insertErr) {
      console.error("message insert error:", insertErr);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    // Update participant last_read_at
    await supabase
      .from("chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("thread_id", threadId)
      .or(`user_ref.eq.${userId},user_id.eq.${participantRow?.user_id ?? ""}`);

    return NextResponse.json({ message: msg });
  } catch (err: any) {
    console.error("Message creation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
