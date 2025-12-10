import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

/**
 * POST /api/chat/messages
 *
 * Creates a new message in a chat thread.
 * Automatically updates the thread's last_message_at and last_sender_role via database trigger.
 *
 * Request body:
 * {
 *   threadId: string (UUID),
 *   content: string,
 *   messageType?: 'text' | 'file' | 'system',
 *   metadata?: object
 * }
 *
 * Response:
 * {
 *   message: { id, thread_id, sender_id, content, ... },
 *   file?: { id, message_id, storage_path, ... } // present for file messages when server stored file metadata
 * }
 */
export async function POST(req: Request) {
  try {
    // Authenticate the user
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { threadId, content, messageType, metadata } = body;

    // Validate required fields
    if (!threadId || (messageType !== "file" && !content)) {
      return NextResponse.json(
        { error: "Missing required fields: threadId and content (for non-file messages)" },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = getServerSupabase();

    // Verify the user is a participant in the thread
    const { data: participant, error: participantError } = await supabase
      .from("chat_participants")
      .select("*")
      .eq("thread_id", threadId)
      .eq("user_id", userId)
      .maybeSingle();

    if (participantError || !participant) {
      console.error("Participant verification error:", participantError);
      return NextResponse.json(
        { error: "You are not a participant in this thread" },
        { status: 403 }
      );
    }

    // Determine sender role based on participant role
    let senderRole: "user" | "agent" | "system" = "user";
    if (participant.role === "agent") {
      senderRole = "agent";
    } else if (messageType === "system") {
      senderRole = "system";
    }

    // Create the message
    const { data: newMessage, error: createError } = await supabase
      .from("chat_messages")
      .insert([
        {
          thread_id: threadId,
          sender_id: userId,
          sender_role: senderRole,
          content: content ?? "",
          message_type: messageType || "text",
          metadata: metadata || {},
        },
      ])
      .select()
      .single();

    if (createError || !newMessage) {
      console.error("Error creating message:", createError);
      return NextResponse.json(
        { error: "Failed to create message", details: createError?.message },
        { status: 500 }
      );
    }

    // Update participant's last_read_at to current time (since they sent it)
    await supabase
      .from("chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("thread_id", threadId)
      .eq("user_id", userId);

    // For file messages: if metadata contains storage path info, create a chat_files row
    let createdFile: any = null;
    try {
      // Accept different keys: storagePath or storage_path
      const storagePath = metadata?.storagePath ?? metadata?.storage_path ?? metadata?.storage_path;
      if (messageType === "file" && storagePath) {
        const fileName = metadata?.fileName ?? metadata?.file_name ?? metadata?.name ?? null;
        const fileSize = metadata?.fileSize ?? metadata?.file_size ?? null;
        const fileType = metadata?.fileType ?? metadata?.file_type ?? null;

        const { data: fileRow, error: fileErr } = await supabase
          .from("chat_files")
          .insert([
            {
              message_id: newMessage.id,
              thread_id: threadId,
              uploaded_by: userId,
              file_name: fileName ?? (typeof fileName === "string" ? fileName : (fileName ?? "upload")),
              file_size: fileSize ?? 0,
              file_type: fileType ?? "application/octet-stream",
              storage_path: storagePath,
              metadata: metadata ?? {},
            },
          ])
          .select()
          .single();

        if (fileErr) {
          console.error("Failed to insert chat_files row:", fileErr);
          // Not fatal - we still return the created message
        } else {
          createdFile = fileRow;
        }
      }
    } catch (fileInsertErr) {
      console.error("Error creating chat_files record:", fileInsertErr);
      // swallow error so message flow isn't broken
    }

    // Return message and optionally file record
    return NextResponse.json({
      message: newMessage,
      file: createdFile,
    });
  } catch (err: any) {
    console.error("Message creation error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/messages
 *
 * Retrieves messages for a specific thread.
 *
 * Query params:
 * - threadId: UUID of the thread (required)
 * - limit: Number of messages to return (default: 100)
 * - before: ISO timestamp - get messages before this time (for pagination)
 *
 * Response:
 * {
 *   messages: [...],
 *   hasMore: boolean
 * }
 */
export async function GET(req: Request) {
  try {
    // Authenticate the user
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const before = searchParams.get("before");

    if (!threadId) {
      return NextResponse.json(
        { error: "Missing required parameter: threadId" },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = getServerSupabase();

    // Verify the user is a participant in the thread
    const { data: participant, error: participantError } = await supabase
      .from("chat_participants")
      .select("*")
      .eq("thread_id", threadId)
      .eq("user_id", userId)
      .maybeSingle();

    if (participantError || !participant) {
      console.error("Participant verification error:", participantError);
      return NextResponse.json(
        { error: "You are not a participant in this thread" },
        { status: 403 }
      );
    }

    // Fetch messages
    let query = supabase
      .from("chat_messages")
      .select("*, chat_files(*)") // include any linked chat_files rows
      .eq("thread_id", threadId)
      .is("deleted_at", null) // Exclude soft-deleted messages
      .order("created_at", { ascending: true });

    if (before) {
      query = query.lt("created_at", before);
    }

    // Fetch limit + 1 to determine if there are more messages
    query = query.limit(limit + 1);

    const { data: messages, error } = await query;

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json(
        { error: "Failed to fetch messages", details: error.message },
        { status: 500 }
      );
    }

    const hasMore = messages && messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages || [];

    return NextResponse.json({
      messages: resultMessages,
      hasMore,
    });
  } catch (err: any) {
    console.error("Message fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
