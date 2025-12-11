// TEMPORARY: /api/debug/supabase/profile
// Protected by x-debug-secret header (DEBUG_SECRET env var).
// This endpoint returns the Clerk userId (if any) and the result/error of a profiles lookup.
// Remove this file after debugging.

import { NextResponse, type NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const header = req.headers.get("x-debug-secret") || "";
  const expected = process.env.DEBUG_SECRET || "";
  if (!expected || header !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Get Clerk auth info (userId) using safeGetAuth inside the handler scope
  const auth = safeGetAuth(req as any) as { userId?: string | null };
  const userId = auth?.userId || null;

  let supabase;
  try {
    supabase = getServiceSupabaseClient();
  } catch (err: any) {
    // Supabase misconfigured (service envs missing)
    return NextResponse.json(
      {
        ok: false,
        error: "server misconfigured: missing Supabase envs",
        supabase_env: {
          SUPABASE_URL_present: !!process.env.SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          NEXT_PUBLIC_SUPABASE_URL_present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        },
      },
      { status: 500 }
    );
  }

  try {
    // Attempt profile lookup for this userId (if available)
    let profileResult: any = null;
    let profileError: any = null;
    if (userId) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, tenant_id, role")
        .eq("user_id", userId)
        .limit(1)
        .single();

      profileResult = data || null;
      profileError = error || null;
    }

    // Try a simple sanity check on the profiles table (fetch a few rows)
    let profilesTableSample: any = null;
    try {
      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .select("id, user_id")
        .limit(5);
      profilesTableSample = pErr ? { error: pErr } : pData;
    } catch (e: any) {
      profilesTableSample = { error: e?.message || String(e) };
    }

    return NextResponse.json({
      ok: true,
      userId,
      profile: profileResult,
      profileError: profileError ? { message: profileError.message || profileError, details: profileError } : null,
      profilesTableSample,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "unknown_error" }, { status: 500 });
  }
}
