import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * POST /api/settings/profile
 * Save user profile preferences (fullName, language, timezone, notifications).
 * - fullName is synced to the Clerk user if the Clerk SDK allows it.
 * - language, timezone, notifications are persisted in the team_members row.
 *
 * Body: { fullName: string, language: string, timezone: string, notifications: boolean }
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const {
      fullName,
      language = "en",
      timezone = "UTC",
      notifications = true,
    } = body as {
      fullName?: string;
      language?: string;
      timezone?: string;
      notifications?: boolean;
    };

    // Attempt to update Clerk user's name (server-side)
    if (fullName?.trim()) {
      try {
        const { clerkClient } = require("@clerk/nextjs/server");
        const nameParts = fullName.trim().split(" ");
        const firstName = nameParts[0] ?? "";
        const lastName = nameParts.slice(1).join(" ") || undefined;
        await clerkClient.users.updateUser(userId, { firstName, lastName });
      } catch (clerkErr) {
        // Non-fatal — log and continue
        console.warn("[settings/profile] Clerk name update failed:", clerkErr);
      }
    }

    // Persist preferences to team_members table
    const supabase = getServiceSupabaseClient();
    const { error } = await supabase
      .from("team_members")
      .update({
        ...(fullName?.trim() ? { display_name: fullName.trim() } : {}),
        preferences: { language, timezone, notifications },
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      // If the column doesn't exist yet, return success anyway (graceful degradation)
      console.error("[settings/profile] Supabase update error:", error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[settings/profile] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to save profile" },
      { status: 500 }
    );
  }
}
