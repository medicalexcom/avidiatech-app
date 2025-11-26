import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2022-11-15" });
// Prefer server APP_URL when set
const CONFIGURED_APP_URL = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

function resolvePriceId(payload: any) {
  if (payload?.priceId && typeof payload.priceId === "string") return payload.priceId;

  const plan = (payload?.plan || "starter").toString().toLowerCase();
  const billing = (payload?.billing || "monthly").toString().toLowerCase();

  const planKey = plan.toUpperCase();
  const monthlyEnv = `STRIPE_PRICE_ID_${planKey}_MONTHLY`;
  const yearlyEnv = `STRIPE_PRICE_ID_${planKey}_YEARLY`;
  const fallbackEnv = `STRIPE_PRICE_ID_${planKey}`; // legacy

  let priceId: string | undefined;

  if (billing === "yearly") {
    priceId = process.env[yearlyEnv];
  } else {
    priceId = process.env[monthlyEnv];
  }

  if (!priceId) {
    priceId = process.env[fallbackEnv];
  }

  return priceId;
}

function getBaseUrlFromRequest(req: Request) {
  if (CONFIGURED_APP_URL) return CONFIGURED_APP_URL;
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  if (host) return `${proto}://${host}`.replace(/\/$/, "");
  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const billing = (body?.billing || "monthly").toString().toLowerCase();
    const priceId = resolvePriceId(body);

    const base = getBaseUrlFromRequest(req);
    const successUrl = `${base}/dashboard?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${base}/dashboard?checkout_canceled=1`;

    // Build a helpful env map for debugging (only price env vars, safe to log)
    const planUpper = (body?.plan || "starter").toString().toUpperCase();
    const envKeys = [
      `STRIPE_PRICE_ID_${planUpper}_MONTHLY`,
      `STRIPE_PRICE_ID_${planUpper}_YEARLY`,
      `STRIPE_PRICE_ID_${planUpper}`,
    ];
    const envMap: Record<string, string | null> = {};
    envKeys.forEach((k) => {
      envMap[k] = typeof process.env[k] === "string" ? process.env[k]! : null;
    });

    console.info("checkout session requested", {
      userId,
      payload: body,
      billing,
      resolvedPriceId: priceId,
      base,
      successUrl,
      cancelUrl,
      CONFIGURED_APP_URL: CONFIGURED_APP_URL || null,
      envMap,
    });

    if (!priceId || typeof priceId !== "string" || !priceId.startsWith("price_")) {
      // Helpful error: include which env keys were visible at runtime
      return NextResponse.json(
        {
          error: "server misconfigured: invalid or missing Stripe price id",
          resolvedPriceId: priceId ?? null,
          envMap,
          hint:
            "Ensure STRIPE_PRICE_ID_<PLAN>_MONTHLY and STRIPE_PRICE_ID_<PLAN>_YEARLY are set in the environment for this deployment and that you've redeployed.",
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
    }

    // Persist stripeCustomerId to Clerk privateMetadata (recommended)
    try {
      const existing = await clerkClient.users.getUser(userId);
      const prevPrivate = (existing?.privateMetadata as any) || {};
      if (prevPrivate?.stripeCustomerId !== customer.id) {
        await clerkClient.users.updateUser(userId, {
          privateMetadata: {
            ...prevPrivate,
            stripeCustomerId: customer.id,
          },
        });
      }
    } catch (err) {
      console.warn("Failed to persist stripeCustomerId to Clerk user metadata:", err);
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
        metadata: { clerkUserId: userId, billing },
      },
      metadata: { clerkUserId: userId, billing },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("create-checkout-session error:", err);
    return NextResponse.json({ error: err.message || "stripe error" }, { status: 500 });
  }
}
