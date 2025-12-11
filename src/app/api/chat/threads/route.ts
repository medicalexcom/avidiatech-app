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
    if (!userId) return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { subject, tenantId: explicitTenantId, forceNew } = body ?? {};
    const supabase = getServerSupabase();

    // Resolve tenant (prefer explicit, try workspace_members/profile if available)
    let tenant: string | null = null;
    if (explicitTenantId) {
      tenant = explicitTenantId;
    } else {
      try {
        const { data: wmByRef } = await supabase
          .from("workspace_members")
          .select("tenant_id")
          .eq("user_ref", userId)
          .limit(1)
          .maybeSingle();
        if (wmByRef?.tenant_id) {
          tenant = wmByRef.tenant_id;
        } else if (isUuid(userId)) {
          // only attempt UUID-based lookup if userId looks like a UUID
          const { data: wmByUUID } = await supabase
            .from("workspace_members")
            .select("tenant_id")
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();
          if (wmByUUID?.tenant_id) tenant = wmByUUID.tenant_id;
        } else {
          // try profiles table (match on id which may be text)
          const { data: profile } = await supabase
            .from("profiles")
            .select("tenant_id")
            .eq("id", userId)
            .limit(1)
            .maybeSingle();
          if (profile?.tenant_id) tenant = profile.tenant_id;
        }
      } catch (err) {
        console.error("Error resolving tenant for user:", err);
        tenant = null;
      }
    }

    // Try to find an existing open thread where the user is a participant (only if not forceNew)
    if (!forceNew) {
      try {
        let participantRows: any[] | null = null;

        if (isUuid(userId)) {
          // if it's a UUID, we can safely compare against user_id and user_ref
          const { data } = await supabase
            .from("chat_participants")
            .select("thread_id")
            .or(`user_id.eq.${userId},user_ref.eq.${userId}`);
          participantRows = data ?? [];
        } else {
          // Clerk id (text) -> only match user_ref
          const { data } = await supabase
            .from("chat_participants")
            .select("thread_id")
            .eq("user_ref", userId);
          participantRows = data ?? [];
        }

        if (participantRows && participantRows.length > 0) {
          const threadIds = participantRows.map((r: any) => r.thread_id).filter(Boolean);
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
      } catch (err) {
        console.error("Error locating existing thread:", err);
      }
    }

    // Create a new thread. Only include tenant_id if resolved (avoid writing Clerk id as tenant)
    const threadInsert: any = { subject: subject || "Support Request", status: "open", priority: "normal" };
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

    // Add creator as participant: write user_ref with Clerk id (leave user_id NULL when Clerk id present)
    try {
      const participantInsert: any = { thread_id: newThread.id, role: "participant" };
      if (isUuid(userId)) participantInsert.user_id = userId;
      else participantInsert.user_ref = userId;

      const { error: pErr } = await supabase.from("chat_participants").insert([participantInsert]);
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

export async function GET(req: Request) {
  try {
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) return NextResponse.json({ error: "Unauthorized - Please sign in" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const supabase = getServerSupabase();

    // Find thread IDs where the user is a participant (prefer user_ref)
    let participantRows: any[] = [];
    if (isUuid(userId)) {
      const { data } = await supabase.from("chat_participants").select("thread_id").or(`user_id.eq.${userId},user_ref.eq.${userId}`);
      participantRows = data ?? [];
    } else {
      const { data } = await supabase.from("chat_participants").select("thread_id").eq("user_ref", userId);
      participantRows = data ?? [];
    }

    const threadIds = participantRows.map((r: any) => r.thread_id).filter(Boolean);
    if (threadIds.length === 0) return NextResponse.json({ threads: [], count: 0 });

    let query = supabase.from("chat_threads").select("*").in("id", threadIds).order("last_message_at", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
    if (status) query = query.eq("status", status);
    const { data: threads, error } = await query;
    if (error) {
      console.error("Error fetching threads:", error);
      return NextResponse.json({ error: "Failed to fetch threads", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ threads: threads || [], count: (threads && threads.length) || 0 });
  } catch (err: any) {
    console.error("Thread fetch error:", err);
    return NextResponse.json({ error: "Internal server error", details: String(err?.message ?? err) }, { status: 500 });
  }
}
