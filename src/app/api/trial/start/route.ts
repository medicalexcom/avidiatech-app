// Add this import at the top:
import { safeGetAuth } from "@/lib/clerkSafe";

// Replace usages like:
// const { userId } = getAuth(req as any);
// with:
const { userId } = safeGetAuth(req as any);

// Rest of file unchanged.


import { NextResponse } from "next/server";
// import your DB / auth helpers
import { getAuth, clerkClient } from "@clerk/nextjs/server";

// Example: create a trial tenant for the signed-in user.
// Replace the pseudo-DB calls with your actual DB/tenant creation logic.
export async function POST(req: Request) {
  try {
    // Authenticate
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // Optionally fetch Clerk user for email/metadata
    let email: string | undefined;
    try {
      const user = await clerkClient.users.getUser(userId);
      email = user.emailAddresses?.[0]?.emailAddress;
    } catch (err) {
      console.warn("Unable to fetch Clerk user for trial creation", err);
    }

    // TODO: Replace with your DB call to create tenant/subscription record
    // await createTenant({ ownerId: userId, email, plan: 'trial', trialEndsAt: Date.now() + 14*24*3600*1000 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("trial start error:", err);
    return NextResponse.json({ error: "Failed to start trial" }, { status: 500 });
  }
}
