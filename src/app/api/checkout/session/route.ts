import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2022-11-15" });
const PRICE_ID = process.env.STRIPE_PRICE_ID!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(req: Request) {
  try {
    // Ensure user is signed in - pass the request into getAuth to match the expected signature
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    // Retrieve Clerk user to get email (if any)
    let email: string | undefined;
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      email = clerkUser.emailAddresses?.[0]?.emailAddress;
    } catch (err) {
      // If the user can't be fetched, continue without email; we'll create a customer without email.
      console.warn("Unable to fetch Clerk user for Stripe customer creation", err);
    }

    // Create or find a Stripe Customer for this user:
    let customer;
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      customer = customers.data[0];
    }

    if (!customer) {
      customer = await stripe.customers.create({
        email,
        metadata: { clerkUserId: userId },
      });
    }

    // Create Checkout Session for subscription
    const successUrl = `${APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${APP_URL}/trial-setup`;

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { clerkUserId: userId },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("create-checkout-session error:", err);
    return NextResponse.json({ error: err.message || "stripe error" }, { status: 500 });
  }
}
