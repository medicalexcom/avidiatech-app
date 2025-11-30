import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";

/**
 * POST /api/trial/start
 *
 * Starts a trial for the signed-in user. Minimal implementation:
 * - Replaces top-level getAuth usage with safeGetAuth(req) called inside the handler
 *   so build-time/middleware detection issues don't surface.
 * - Dynamically requires clerkClient only when needed so build-time contexts without
 *   Clerk initialized won't fail.
 *
 * Replace the pseudo-DB / tenant creation logic with your real implementation.
 */
export async function POST(req: Request) {
  try {
    // Authenticate using safeGetAuth inside handler scope
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // Optionally fetch Clerk user for email/metadata (require dynamically)
    let email: string | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { clerkClient } = require("@clerk/nextjs/server");
      const user = await clerkClient.users.getUser(userId);
      email = user?.emailAddresses?.[0]?.emailAddress;
    } catch (err) {
      // Log and continue — fetching Clerk user is optional for trial creation
      console.warn("Unable to fetch Clerk user for trial creation:", String(err));
    }

    // TODO: Replace with your DB call to create tenant/subscription record
    // Example:
    // await createTenant({ ownerId: userId, email, plan: 'trial', trialEndsAt: Date.now() + 14*24*3600*1000 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("trial start error:", err);
    return NextResponse.json({ error: "Failed to start trial", details: String(err?.message ?? err) }, { status: 500 });
  }
}
