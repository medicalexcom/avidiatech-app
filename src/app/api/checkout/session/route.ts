import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2022-11-15" });
const CONFIGURED_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

/**
 * resolvePriceId: same mapping logic as before — payload.priceId preferred, otherwise map plan keys.
 */
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

/**
 * Helper: build a base URL for success/cancel. Prefer configured env (production).
 * Fallback: derive origin from request headers (origin or x-forwarded-proto + host).
 */
function getBaseUrlFromRequest(req: Request) {
  if (CONFIGURED_APP_URL) return CONFIGURED_APP_URL.replace(/\/$/, "");
  // Prefer Origin header if present (client or proxy)
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  // Fallback to forwarded proto + host, or host alone (assume https if missing)
  const proto = req.headers.get("x-forwarded-proto") || req.headers.get("x-forwarded-protocol") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  if (host) {
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  // Last fallback: localhost
  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const priceId = resolvePriceId(body);

    const base = getBaseUrlFromRequest(req);
    const successUrl = `${base}/dashboard?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${base}/dashboard?checkout_canceled=1`;

    console.info("checkout session requested", {
      userId,
      payload: body,
      resolvedPriceId: priceId,
      base,
      successUrl,
      cancelUrl,
    });

    if (!priceId || typeof priceId !== "string" || !priceId.startsWith("price_")) {
      console.error("Invalid or missing priceId:", priceId, "payload:", body);
      return NextResponse.json(
        {
          error: "server misconfigured: invalid or missing Stripe price id",
          resolvedPriceId: priceId ?? null,
          hint:
            "Ensure STRIPE_PRICE_ID_STARTER/STRIPE_PRICE_ID_GROWTH/STRIPE_PRICE_ID_PRO are set in your environment, or pass priceId in the request body.",
        },
        { status: 500 }
      );
    }

    // Retrieve Clerk user email (optional)
    let email: string | undefined;
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      email = clerkUser.emailAddresses?.[0]?.emailAddress;
    } catch (err) {
      console.warn("Unable to fetch Clerk user email:", err);
    }

    // Find or create Stripe customer
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

      // Persist stripeCustomerId to Clerk privateMetadata (recommended)
      try {
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
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("create-checkout-session error:", err);
    return NextResponse.json({ error: err.message || "stripe error" }, { status: 500 });
  }
}
