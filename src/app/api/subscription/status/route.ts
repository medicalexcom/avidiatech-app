import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import Stripe from "stripe";
import { isOwnerUser } from "@/lib/auth/isOwnerUser";
import { clerkClient } from "@clerk/nextjs/server";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
  : null;

export async function GET(req: Request) {
  try {
    // Use safeGetAuth inside the handler scope
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) {
      return NextResponse.json(
        { active: false, reason: "unauthenticated" },
        { status: 200 }
      );
    }

    // 1) OWNER BYPASS: treat owners as already subscribed
    try {
      const owner = await isOwnerUser(userId);
      if (owner) {
        // For the UI, owners "look" like any subscribed user
        return NextResponse.json(
          {
            active: true,
            status: "active",
            isOwner: true,
            reason: "owner",
          },
          { status: 200 }
        );
      }
    } catch (err) {
      console.warn("Owner detection failed:", err);
      // If owner detection fails, fall back to normal subscription logic
    }

    // 2) Non-owner flow: Stripe subscription lookup
    if (!stripe) {
      console.warn("Stripe key not set; treating as no subscription.");
      return NextResponse.json(
        { active: false, reason: "no_stripe" },
        { status: 200 }
      );
    }

    // Fetch Clerk user for Stripe metadata + email
    let clerkUser: any | undefined;
    try {
      const client = await clerkClient();
      clerkUser = await client.users.getUser(userId);
    } catch (err) {
      console.warn(
        "Failed to fetch clerk user for Stripe subscription lookup:",
        String(err)
      );
      clerkUser = undefined;
    }

    // Find a stripe customer id from Clerk metadata or by email
    const stripeCustomerId =
      (clerkUser?.privateMetadata as any)?.stripeCustomerId ||
      (clerkUser?.publicMetadata as any)?.stripeCustomerId ||
      undefined;

    let customerId = stripeCustomerId;

    if (!customerId) {
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
      if (email) {
        try {
          const customers = await stripe.customers.list({ email, limit: 1 });
          if (customers.data && customers.data.length > 0) {
            customerId = customers.data[0].id;
          }
        } catch (err) {
          console.warn("Stripe customer lookup by email failed:", err);
        }
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { active: false, reason: "no_customer" },
        { status: 200 }
      );
    }

    try {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        limit: 50,
      });

      if (subs.data && subs.data.length > 0) {
        for (const s of subs.data) {
          if (s.status === "trialing" || s.status === "active") {
            return NextResponse.json(
              { active: true, status: s.status, isOwner: false },
              { status: 200 }
            );
          }
        }
      }
    } catch (err) {
      console.warn("Stripe subscriptions lookup failed:", err);
      return NextResponse.json(
        { active: false, reason: "stripe_lookup_failed" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { active: false, reason: "no_active_subscription" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("subscription status route error:", err);
    return NextResponse.json(
      { active: false, reason: "internal_error" },
      { status: 500 }
    );
  }
}
