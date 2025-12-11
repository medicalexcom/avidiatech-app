 url=https://github.com/medicalexcom/avidiatech-app/blob/main/src/app/api/chat/threads/route.ts
import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServerSupabase } from "@/lib/supabase";

function isUuid(s?: string) {
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

/**
 * Stable public threads endpoint (creates/returns thread)
 * This version uses user_ref and avoids passing Clerk user ids to UUID columns.
 */
export async function POST(req: Request) {
  try {
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { subject, tenantId: explicitTenantId, forceNew } = body ?? {};
    const supabase = getServerSupabase();

    // Resolve tenant: prefer explicitTenantId if it's a UUID; otherwise try workspace_members/profiles.
    let tenant: string | null = null;
    if (explicitTenantId && isUuid(explicitTenantId)) {
      tenant = explicitTenantId;
    } else {
      // Try workspace_members.user_ref => tenant_id (only accept UUID results)
      try {
        const { data: wm } = await supabase
          .from("workspace_members")
          .select("tenant_id")
          .eq("user_ref", userId)
          .limit(1)
          .maybeSingle();
        if (wm?.tenant_id && isUuid(String(wm.tenant_id))) tenant = String(wm.tenant_id);

        if (!tenant && isUuid(userId)) {
          const { data: wm2 } = await supabase
            .from("workspace_members")
            .select("tenant_id")
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();
          if (wm2?.tenant_id && isUuid(String(wm2.tenant_id))) tenant = String(wm2.tenant_id);
        }

        if (!tenant) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("tenant_id")
            .eq("id", userId)
            .limit(1)
            .maybeSingle();
          if (profile?.tenant_id && isUuid(String(profile.tenant_id))) tenant = String(profile.tenant_id);
        }
      } catch (e) {
        console.error("tenant resolution error:", e);
      }
    }

    if (!tenant) {
      return NextResponse.json(
        {
          error:
            "Tenant resolution failed. Provide tenantId (UUID) or configure workspace_members/profiles mapping.",
        },
        { status: 400 }
      );
    }

    // If not forceNew, find an open thread where user is a participant
    if (!forceNew) {
      try {
        let participantRows: any[] = [];
        if (isUuid(userId)) {
          // safe separate queries
          const [byId, byRef] = await Promise.all([
            supabase.from("chat_participants").select("thread_id").eq("user_id", userId),
            supabase.from("chat_participants").select("thread_id").eq("user_ref", userId),
          ]);
          participantRows = [...(byId.data ?? []), ...(byRef.data ?? [])];
        } else {
          const { data } = await supabase.from("chat_participants").select("thread_id").eq("user_ref", userId);
          participantRows = data ?? [];
        }

        if (participantRows.length > 0) {
          const threadIds = Array.from(new Set(participantRows.map((r: any) => r.thread_id).filter(Boolean)));
          if (threadIds.length > 0) {
            let q = supabase
              .from("chat_threads")
              .select("*")
              .in("id", threadIds)
              .eq("tenant_id", tenant)
              .eq("status", "open")
              .order("last_message_at", { ascending: false })
              .limit(1);
            const { data: existing, error } = await q;
            if (!error && existing && existing.length > 0) return NextResponse.json({ thread: existing[0], isNew: false });
          }
        }
      } catch (e) {
        console.error("Error locating existing thread:", e);
      }
    }

    // Create thread
    const threadInsert: any = { tenant_id: tenant, subject: subject || "Support Request", status: "open", priority: "normal" };
    const { data: newThread, error: createError } = await supabase.from("chat_threads").insert([threadInsert]).select().single();
    if (createError || !newThread) {
      console.error("Error creating thread:", createError);
      return NextResponse.json({ error: "Failed to create support thread", details: createError?.message }, { status: 500 });
    }

    // Add participant using user_ref for Clerk ids
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
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const supabase = getServerSupabase();

    let participantRows: any[] = [];
    if (isUuid(userId)) {
      const [byId, byRef] = await Promise.all([
        supabase.from("chat_participants").select("thread_id").eq("user_id", userId),
        supabase.from("chat_participants").select("thread_id").eq("user_ref", userId),
      ]);
      participantRows = [...(byId.data ?? []), ...(byRef.data ?? [])];
    } else {
      const { data } = await supabase.from("chat_participants").select("thread_id").eq("user_ref", userId);
      participantRows = data ?? [];
    }

    const threadIds = Array.from(new Set(participantRows.map((r: any) => r.thread_id).filter(Boolean)));
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
