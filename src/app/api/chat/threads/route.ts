import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

/**
 * POST /api/chat/threads
 *
 * Creates a new support thread or returns an existing open thread for the user.
 *
 * Expected body:
 * {
 *   subject?: string,
 *   tenantId?: string,
 *   forceNew?: boolean
 * }
 *
 * Notes:
 * - Do NOT default tenant to userId (Clerk id is not a tenant UUID).
 * - Try to resolve tenant from workspace_members or profiles; if not available, create thread with no tenant.
 */
export async function POST(req: Request) {
  try {
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { subject, tenantId: explicitTenantId, forceNew } = body ?? {};

    const supabase = getServerSupabase();

    // Resolve tenant id:
    // 1) prefer explicit tenantId from client
    // 2) try workspace_members (lookup by user_ref or user_id)
    // 3) try profiles (if your app stores tenant on profiles)
    // 4) if none found, leave tenant null (create thread without tenant)
    let tenant: string | null = null;
    if (explicitTenantId) {
      tenant = explicitTenantId;
    } else {
      try {
        // lookup workspace_members by user_ref (text) first
        const { data: wmByRef } = await supabase
          .from("workspace_members")
          .select("tenant_id")
          .eq("user_ref", userId)
          .limit(1)
          .maybeSingle();

        if (wmByRef && (wmByRef as any).tenant_id) {
          tenant = (wmByRef as any).tenant_id;
        } else {
          // fallback: lookup where user_id equals a UUID stored in workspace_members (safe attempt)
          const { data: wmByUUID } = await supabase
            .from("workspace_members")
            .select("tenant_id")
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();

          if (wmByUUID && (wmByUUID as any).tenant_id) {
            tenant = (wmByUUID as any).tenant_id;
          } else {
            // try profiles table
            const { data: profile } = await supabase
              .from("profiles")
              .select("tenant_id")
              .eq("id", userId)
              .limit(1)
              .maybeSingle();

            if (profile && (profile as any).tenant_id) {
              tenant = (profile as any).tenant_id;
            } else {
              // last resort: no tenant found — keep tenant null
              tenant = null;
            }
          }
        }
      } catch (err) {
        console.error("Error resolving tenant for user:", err);
        tenant = null;
      }
    }

    // Attempt to find an existing open thread for this user (only if not forceNew)
    if (!forceNew) {
      try {
        // Prefer fast lookup by participant.user_ref (stores Clerk id)
        const { data: partsByRef, error: partRefErr } = await supabase
          .from("chat_participants")
          .select("thread_id")
          .eq("user_ref", userId);

        if (partRefErr) {
          console.error("Error fetching participant rows by user_ref:", partRefErr);
        } else if (partsByRef && partsByRef.length > 0) {
          const threadIds = partsByRef.map((r: any) => r.thread_id).filter(Boolean);
          if (threadIds.length > 0) {
            let q = supabase
              .from("chat_threads")
              .select("*")
              .in("id", threadIds)
              .eq("status", "open")
              .order("last_message_at", { ascending: false })
              .limit(1);

            if (tenant) q = q.eq("tenant_id", tenant);

            const { data: existingThreads, error: threadErr } = await q;
            if (threadErr) {
              console.error("Error fetching existing thread:", threadErr);
            } else if (existingThreads && existingThreads.length > 0) {
              return NextResponse.json({ thread: existingThreads[0], isNew: false });
            }
          }
        }

        // If no participant rows by user_ref, attempt small fallback scan: participant rows with user_id cast to text
        // Note: avoid sending the Clerk id to a uuid column equality to prevent 22P02
        const { data: partsAll, error: partsAllErr } = await supabase
          .from("chat_participants")
          .select("thread_id, user_id")
          .limit(1000);

        if (partsAllErr) {
          console.error("Error fetching participant rows for fallback:", partsAllErr);
        } else if (partsAll && partsAll.length > 0) {
          const matchingThreadIds = (partsAll as any[])
            .filter((r) => {
              try {
                return String(r.user_id) === userId;
              } catch {
                return false;
              }
            })
            .map((r) => r.thread_id)
            .filter(Boolean);

          if (matchingThreadIds.length > 0) {
            let q2 = supabase
              .from("chat_threads")
              .select("*")
              .in("id", matchingThreadIds)
              .eq("status", "open")
              .order("last_message_at", { ascending: false })
              .limit(1);

            if (tenant) q2 = q2.eq("tenant_id", tenant);

            const { data: existingThreads2, error: threadErr2 } = await q2;
            if (threadErr2) console.error("Error fetching existing thread (fallback):", threadErr2);
            else if (existingThreads2 && existingThreads2.length > 0) {
              return NextResponse.json({ thread: existingThreads2[0], isNew: false });
            }
          }
        }
      } catch (err) {
        console.error("Error locating existing thread:", err);
        // continue to create a new thread
      }
    }

    // Create new thread. Only include tenant_id if we resolved it (avoid inserting Clerk id as tenant)
    const threadInsert: any = {
      subject: subject || "Support Request",
      status: "open",
      priority: "normal",
    };
    if (tenant) threadInsert.tenant_id = tenant;

    const { data: newThread, error: createError } = await supabase
      .from("chat_threads")
      .insert([threadInsert])
      .select()
      .single();

    if (createError || !newThread) {
      console.error("Error creating thread:", createError);
      return NextResponse.json({ error: "Failed to create support thread", details: createError?.message }, { status: 500 });
    }

    // Add creator as participant: write user_ref (Clerk id) and leave user_id null (safe)
    try {
      const { error: pErr } = await supabase
        .from("chat_participants")
        .insert([{ thread_id: newThread.id, user_id: null, user_ref: userId, role: "participant" }]);

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

/* GET handler remains similar: returns threads where the user is participant (use user_ref lookup)
   (You can keep your existing GET implementation but ensure it uses user_ref to find participant thread IDs.) */
