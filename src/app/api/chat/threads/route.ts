import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

/**
 * POST /api/chat/threads
 *
 * Creates a new support thread or returns an existing open thread for the user.
 *
 * Request body (optional):
 * {
 *   subject?: string,
 *   tenantId?: string,
 *   forceNew?: boolean  // If true, always create a new thread
 * }
 *
 * Response:
 * {
 *   thread: { id, tenant_id, subject, status, ... },
 *   isNew: boolean
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
    const body = await req.json().catch(() => ({}));
    const { subject, tenantId, forceNew } = body;

    // Get Supabase server client
    const supabase = getServerSupabase();

    // Determine tenant. Use provided tenantId or fallback to userId (or adjust to your tenant resolution)
    const tenant = tenantId || userId;

    // If not forcing a new thread, attempt to locate an existing open thread where the user is a participant
    if (!forceNew) {
      // 1) fetch participant rows for this user
      const { data: participantRows, error: partErr } = await supabase
        .from("chat_participants")
        .select("thread_id")
        .eq("user_id", userId);

      if (partErr) {
        console.error("Error fetching participant rows:", partErr);
        // continue to creation flow — don't bail out (server is trusted)
      } else if (participantRows && participantRows.length > 0) {
        const threadIds = participantRows.map((r: any) => r.thread_id).filter(Boolean);

        if (threadIds.length > 0) {
          // 2) find an open thread for these ids matching tenant
          const { data: existingThreads, error: threadErr } = await supabase
            .from("chat_threads")
            .select("*")
            .in("id", threadIds)
            .eq("tenant_id", tenant)
            .eq("status", "open")
            .order("last_message_at", { ascending: false })
            .limit(1);

          if (threadErr) {
            console.error("Error fetching existing thread:", threadErr);
          } else if (existingThreads && existingThreads.length > 0) {
            return NextResponse.json({
              thread: existingThreads[0],
              isNew: false,
            });
          }
        }
      }
    }

    // Create a new thread (do not attempt to insert 'created_by' if the column may not exist)
    const { data: newThread, error: createError } = await supabase
      .from("chat_threads")
      .insert([
        {
          tenant_id: tenant,
          subject: subject || "Support Request",
          status: "open",
          priority: "normal",
        },
      ])
      .select()
      .single();

    if (createError || !newThread) {
      console.error("Error creating thread:", createError);
      return NextResponse.json(
        { error: "Failed to create support thread", details: createError?.message },
        { status: 500 }
      );
    }

    // Add the creator as a participant (if your chat_participants table exists)
    try {
      const { error: pErr } = await supabase
        .from("chat_participants")
        .insert([
          {
            thread_id: newThread.id,
            user_id: userId,
            role: "participant",
          },
        ]);

      if (pErr) {
        console.error("Error adding participant:", pErr);
        // non-fatal - thread created successfully
      }
    } catch (e) {
      console.error("Unexpected error adding participant:", e);
    }

    return NextResponse.json({
      thread: newThread,
      isNew: true,
    });
  } catch (err: any) {
    console.error("Thread creation error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/threads
 *
 * Retrieves all threads for the authenticated user.
 *
 * Query params:
 * - status: Filter by status (open, closed, archived)
 * - limit: Number of threads to return (default: 50)
 *
 * Response:
 * {
 *   threads: [...],
 *   count: number
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
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const supabase = getServerSupabase();

    // First get thread IDs where the user is a participant
    const { data: participantRows, error: pErr } = await supabase
      .from("chat_participants")
      .select("thread_id")
      .eq("user_id", userId);

    if (pErr) {
      console.error("Error fetching participant thread ids:", pErr);
      return NextResponse.json(
        { error: "Failed to fetch threads", details: pErr.message },
        { status: 500 }
      );
    }

    const threadIds = (participantRows || []).map((r: any) => r.thread_id).filter(Boolean);
    if (threadIds.length === 0) {
      return NextResponse.json({ threads: [], count: 0 });
    }

    let query = supabase
      .from("chat_threads")
      .select("*")
      .in("id", threadIds)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);

    const { data: threads, error } = await query;

    if (error) {
      console.error("Error fetching threads:", error);
      return NextResponse.json(
        { error: "Failed to fetch threads", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      threads: threads || [],
      count: (threads && threads.length) || 0,
    });
  } catch (err: any) {
    console.error("Thread fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
