import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2022-11-15" });
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(req: Request) {
  try {
    // Authenticate the request
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    // Fetch Clerk user (to check for stored stripeCustomerId or email)
    let clerkUser;
    try {
      clerkUser = await clerkClient.users.getUser(userId);
    } catch (err) {
      console.warn("Unable to fetch Clerk user for billing portal creation", err);
    }

    // 1) Preferred: try to read stripeCustomerId from Clerk privateMetadata (server-only)
    const stripeCustomerId =
      (clerkUser?.privateMetadata as any)?.stripeCustomerId ||
      (clerkUser?.publicMetadata as any)?.stripeCustomerId ||
      undefined;

    let customerId = stripeCustomerId;

    // 2) Fallback: if no stored customer id, try to find by email
    if (!customerId) {
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
      if (email) {
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data && customers.data.length > 0) {
          customerId = customers.data[0].id;
        }
      }
    }

    // If we still don't have a customer id, tell the client to create one (via checkout)
    if (!customerId) {
      return NextResponse.json({ error: "no_stripe_customer", message: "No Stripe customer found for this user. Create a subscription/checkout first." }, { status: 400 });
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_URL}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("create-billing-portal error:", err);
    return NextResponse.json({ error: err.message || "stripe error" }, { status: 500 });
  }
}
