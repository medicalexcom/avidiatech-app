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

    // Get Supabase client with service role
    const supabase = getServerSupabase();

    // Determine tenant_id (you may want to fetch this from user metadata or a database table)
    // For now, we'll use the provided tenantId or default to userId as tenant
    const tenant = tenantId || userId;

    // If not forcing a new thread, check for existing open thread
    if (!forceNew) {
      const { data: existingThread, error: fetchError } = await supabase
        .from("chat_threads")
        .select("*")
        .eq("created_by", userId)
        .eq("tenant_id", tenant)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching existing thread:", fetchError);
        // Continue to create new thread if fetch fails
      }

      if (existingThread) {
        // Return existing open thread
        return NextResponse.json({
          thread: existingThread,
          isNew: false,
        });
      }
    }

    // Create a new thread
    const { data: newThread, error: createError } = await supabase
      .from("chat_threads")
      .insert([
        {
          tenant_id: tenant,
          subject: subject || "Support Request",
          status: "open",
          priority: "normal",
          created_by: userId,
        },
      ])
      .select()
      .single();

    if (createError) {
      console.error("Error creating thread:", createError);
      return NextResponse.json(
        { error: "Failed to create support thread", details: createError.message },
        { status: 500 }
      );
    }

    // Add the creator as a participant
    const { error: participantError } = await supabase
      .from("chat_participants")
      .insert([
        {
          thread_id: newThread.id,
          user_id: userId,
          role: "participant",
        },
      ]);

    if (participantError) {
      console.error("Error adding participant:", participantError);
      // Non-fatal - thread is already created
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
    const status = searchParams.get("status") || "open";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Get Supabase client
    const supabase = getServerSupabase();

    // Fetch threads where user is the creator or a participant
    let query = supabase
      .from("chat_threads")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    // Filter to threads where user is creator
    query = query.eq("created_by", userId);

    const { data: threads, error, count } = await query;

    if (error) {
      console.error("Error fetching threads:", error);
      return NextResponse.json(
        { error: "Failed to fetch threads", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      threads: threads || [],
      count: count || threads?.length || 0,
    });
  } catch (err: any) {
    console.error("Thread fetch error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
