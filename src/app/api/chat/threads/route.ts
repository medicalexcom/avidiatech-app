import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

/**
 * POST /api/chat/threads
 * Creates a new support thread or returns an existing open thread for the user.
 */
export async function POST(req: Request) {
  try {
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { subject, tenantId, forceNew } = body;
    const supabase = getServerSupabase();

    const tenant = tenantId || userId;

    // Use user_ref (text) when available; fallback logic below if needed
    if (!forceNew) {
      // Try to find threads where chat_participants.user_ref = userId
      const { data: participantRowsByRef, error: partRefErr } = await supabase
        .from("chat_participants")
        .select("thread_id")
        .eq("user_ref", userId);

      if (partRefErr) {
        console.error("Error fetching participant rows by user_ref:", partRefErr);
      } else if (participantRowsByRef && participantRowsByRef.length > 0) {
        const threadIds = participantRowsByRef.map((r: any) => r.thread_id).filter(Boolean);
        if (threadIds.length > 0) {
          const { data: existingThreads, error: threadErr } = await supabase
            .from("chat_threads")
            .select("*")
            .in("id", threadIds)
            .eq("tenant_id", tenant)
            .eq("status", "open")
            .order("last_message_at", { ascending: false })
            .limit(1);

          if (threadErr) {
            console.error("Error fetching existing thread by threadIds:", threadErr);
          } else if (existingThreads && existingThreads.length > 0) {
            return NextResponse.json({ thread: existingThreads[0], isNew: false });
          }
        }
      }

      // If no rows by user_ref, attempt a safe scan: fetch participant rows and compare user_id::text
      // (This avoids sending the raw Clerk ID as a UUID to Postgres which caused the earlier error.)
      try {
        const { data: participantRowsAll, error: partAllErr } = await supabase
          .from("chat_participants")
          .select("thread_id, user_id")
          .limit(500); // limit to avoid scanning massive tables — adjust as needed
        if (partAllErr) {
          console.error("Error fetching participant rows for fallback scan:", partAllErr);
        } else if (participantRowsAll && participantRowsAll.length > 0) {
          // we compare user_id (uuid) converted to text with the external userId string
          const matchingThreadIds = participantRowsAll
            .filter((r: any) => {
              try {
                return String(r.user_id) === userId;
              } catch {
                return false;
              }
            })
            .map((r: any) => r.thread_id)
            .filter(Boolean);

          if (matchingThreadIds.length > 0) {
            const { data: existingThreads2, error: threadErr2 } = await supabase
              .from("chat_threads")
              .select("*")
              .in("id", matchingThreadIds)
              .eq("tenant_id", tenant)
              .eq("status", "open")
              .order("last_message_at", { ascending: false })
              .limit(1);

            if (threadErr2) {
              console.error("Error fetching existing thread (fallback):", threadErr2);
            } else if (existingThreads2 && existingThreads2.length > 0) {
              return NextResponse.json({ thread: existingThreads2[0], isNew: false });
            }
          }
        }
      } catch (e) {
        console.error("Fallback participant scan error:", e);
      }
    }

    // Create a new thread (do not insert non-existent columns)
    const { data: newThread, error: createError } = await supabase
      .from("chat_threads")
      .insert([{ tenant_id: tenant, subject: subject || "Support Request", status: "open", priority: "normal" }])
      .select()
      .single();

    if (createError || !newThread) {
      console.error("Error creating thread:", createError);
      return NextResponse.json({ error: "Failed to create support thread", details: createError?.message }, { status: 500 });
    }

    // Add the creator as a participant — write user_ref as the external id (Clerk user id)
    try {
      const { error: pErr } = await supabase.from("chat_participants").insert([
        { thread_id: newThread.id, user_id: null, user_ref: userId, role: "participant" },
      ]);
      if (pErr) console.error("Error adding participant:", pErr);
    } catch (e) {
      console.error("Unexpected error adding participant:", e);
    }

    return NextResponse.json({ thread: newThread, isNew: true });
  } catch (err: any) {
    console.error("Thread creation error:", err);
    return NextResponse.json({ error: "Internal server error", details: String(err?.message ?? err) }, { status: 500 });
  }
}
