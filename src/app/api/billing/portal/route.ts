import { NextResponse } from "next/server";
import Stripe from "stripe";
import { safeGetAuth } from "@/lib/clerkSafe";

/**
 * Creates a Stripe Billing Portal session for the current user.
 * - Uses safeGetAuth to avoid Clerk runtime warnings when middleware detection is imperfect.
 * - Attempts to read the stripeCustomerId from Clerk user metadata.
 * - Returns a portal URL on success.
 *
 * Note: This is a minimal, sensible implementation. If your app stores customer IDs elsewhere
 * (e.g. Supabase) or has a different return URL, adapt the lookup/return_url accordingly.
 */

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET, { apiVersion: "2022-11-15" }) : null;

export async function POST(req: Request) {
  try {
    const { userId } = safeGetAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ error: "stripe-not-configured" }, { status: 500 });
    }

    // Use Clerk to fetch user metadata (required to read stripeCustomerId by default)
    // Require dynamically so build-time environments that don't have Clerk won't fail.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { clerkClient } = require("@clerk/nextjs/server");

    let clerkUser: any = null;
    try {
      clerkUser = await clerkClient.users.getUser(userId);
    } catch (err) {
      // If Clerk lookup fails, surface a 500 so caller can diagnose.
      return NextResponse.json({ error: "failed-to-fetch-clerk-user", details: String(err?.message ?? err) }, { status: 500 });
    }

    const stripeCustomerId =
      (clerkUser?.privateMetadata as any)?.stripeCustomerId ||
      (clerkUser?.publicMetadata as any)?.stripeCustomerId ||
      undefined;

    if (!stripeCustomerId) {
      return NextResponse.json({ error: "no-stripe-customer", message: "No Stripe customer id found for user" }, { status: 400 });
    }

    const returnUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` : `${process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000"}/dashboard`;

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: returnUrl,
      });

      return NextResponse.json({ url: session.url });
    } catch (err: any) {
      return NextResponse.json({ error: "stripe-failed", details: String(err?.message ?? err) }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: "unexpected", details: String(err?.message ?? err) }, { status: 500 });
  }
}
