import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2022-11-15" });
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function resolvePriceId(payload: any) {
  if (payload?.priceId && typeof payload.priceId === "string") return payload.priceId;
  const plan = (payload?.plan || "starter").toString().toLowerCase();
  const map: Record<string, string | undefined> = {
    starter: process.env.STRIPE_PRICE_ID_STARTER,
    growth: process.env.STRIPE_PRICE_ID_GROWTH,
    pro: process.env.STRIPE_PRICE_ID_PRO,
    default: process.env.STRIPE_PRICE_ID_STARTER,
  };
  return map[plan] ?? map.default;
}

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const priceId = resolvePriceId(body);

    console.info("checkout session requested", { userId, payload: body, resolvedPriceId: priceId });

    if (!priceId || typeof priceId !== "string" || !priceId.startsWith("price_")) {
      console.error("Invalid or missing priceId:", priceId, "payload:", body);
      return NextResponse.json({ error: "server misconfigured: invalid or missing Stripe price id" }, { status: 500 });
    }

    // Get Clerk user email (optional)
    let email: string | undefined;
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      email = clerkUser.emailAddresses?.[0]?.emailAddress;
    } catch (err) {
      console.warn("Unable to fetch Clerk user email:", err);
    }

    // Find or create customer
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

      // Persist stripeCustomerId to Clerk privateMetadata (server-side)
      try {
        // merge with existing privateMetadata if needed
        const existing = await clerkClient.users.getUser(userId);
        const prevPrivate = (existing?.privateMetadata as any) || {};
        await clerkClient.users.updateUser(userId, {
          privateMetadata: {
            ...prevPrivate,
            stripeCustomerId: customer.id,
          },
        });
      } catch (err) {
        console.warn("Failed to persist stripeCustomerId to Clerk user metadata:", err);
      }
    }

    // Create Checkout session with 14-day trial
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 14,
        metadata: { clerkUserId: userId },
      },
      metadata: { clerkUserId: userId },
      success_url: `${APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("create-checkout-session error:", err);
    return NextResponse.json({ error: err.message || "stripe error" }, { status: 500 });
  }
}
