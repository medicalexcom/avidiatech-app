import { NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" }) : null;

export async function GET(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ active: false, reason: "unauthenticated" }, { status: 200 });

    // Try Clerk privateMetadata first
    let clerkUser;
    try {
      clerkUser = await clerkClient.users.getUser(userId);
    } catch (err) {
      console.warn("Failed to fetch clerk user:", err);
    }

    const stripeCustomerId =
      (clerkUser?.privateMetadata as any)?.stripeCustomerId || (clerkUser?.publicMetadata as any)?.stripeCustomerId || undefined;

    let customerId = stripeCustomerId;

    if (!customerId && stripe) {
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
      if (email) {
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data && customers.data.length > 0) {
          customerId = customers.data[0].id;
        }
      }
    }

    if (!customerId) return NextResponse.json({ active: false, reason: "no_customer" }, { status: 200 });

    if (!stripe) return NextResponse.json({ active: false, reason: "no_stripe_config" }, { status: 200 });

    const subs = await stripe.subscriptions.list({ customer: customerId, limit: 50 });
    if (subs.data && subs.data.length > 0) {
      for (const s of subs.data) {
        if (s.status === "trialing" || s.status === "active") {
          return NextResponse.json({ active: true, status: s.status }, { status: 200 });
        }
      }
    }

    return NextResponse.json({ active: false, reason: "no_active_subscription" }, { status: 200 });
  } catch (err: any) {
    console.error("subscription status error", err);
    return NextResponse.json({ active: false, reason: "error", message: String(err) }, { status: 500 });
  }
}
