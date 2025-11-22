import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2022-11-15" });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function resolvePriceIdFromPayload(payload: any) {
  // Accept either a direct priceId from the client or a plan name that maps to server envs
  const directPriceId = payload?.priceId;
  if (directPriceId) return directPriceId;

  const plan = payload?.plan || "default";
  const priceMap: Record<string, string | undefined> = {
    basic: process.env.STRIPE_PRICE_ID_BASIC,
    pro: process.env.STRIPE_PRICE_ID_PRO,
    enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    default: process.env.STRIPE_PRICE_ID,
  };
  return priceMap[plan];
}

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const priceId = resolvePriceIdFromPayload(body);

    // Defensive validation
    if (!priceId || typeof priceId !== "string" || !priceId.startsWith("price_")) {
      console.error("Invalid or missing priceId:", priceId);
      return NextResponse.json(
        { error: "server misconfigured: invalid or missing Stripe price id" },
        { status: 500 }
      );
    }

    // Get Clerk user email if available
    let email: string | undefined;
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      email = clerkUser.emailAddresses?.[0]?.emailAddress;
    } catch (err) {
      console.warn("Unable to fetch Clerk user email:", err);
    }

    // Create or find Stripe customer
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

    const successUrl = `${APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${APP_URL}/trial-setup`;

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }], // <-- ensure 'price' is present and valid
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
