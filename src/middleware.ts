import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, getAuth, clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET, { apiVersion: "2022-11-15" }) : null;

/**
 * Allowed paths under /dashboard for unauthenticated / unsubscribed users.
 */
const ALLOWLIST = [
  "/dashboard/pricing",
  "/dashboard/account",
  "/dashboard/organization",
  "/api/checkout/session",
  "/api/billing/portal",
  "/api/webhooks/stripe",
];

function isAllowedPath(pathname: string) {
  if (ALLOWLIST.includes(pathname)) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname.startsWith("/favicon.ico")) return true;
  return false;
}

async function userHasActiveSubscription(userId: string | undefined) {
  if (!userId) return false;
  if (!stripe) {
    console.warn("Stripe secret key not configured; treating as no active subscription.");
    return false;
  }

  let clerkUser;
  try {
    clerkUser = await clerkClient.users.getUser(userId);
  } catch (err) {
    console.warn("Unable to fetch Clerk user:", err);
  }

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
        console.warn("Stripe customer list by email failed:", err);
      }
    }
  }

  if (!customerId) return false;

  try {
    const subs = await stripe.subscriptions.list({ customer: customerId, limit: 20 });
    if (subs.data && subs.data.length > 0) {
      for (const s of subs.data) {
        if (s.status === "trialing" || s.status === "active") {
          return true;
        }
      }
    }
  } catch (err) {
    console.warn("Stripe subscriptions list failed:", err);
  }

  return false;
}

/**
 * Use clerkMiddleware to initialize Clerk auth for requests. inside afterAuth we run our gate.
 * clerkMiddleware ensures getAuth() works and prevents the MIDDLEWARE_INVOCATION_FAILED error.
 */
export default clerkMiddleware({
  async afterAuth(req: NextRequest) {
    const pathname = req.nextUrl.pathname;

    // If not a dashboard path and not an API that we want to gate, just continue.
    if (!pathname.startsWith("/dashboard") && !pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    // Allow explicit allowlist paths (pricing, billing endpoints, webhooks, sign-in/up)
    if (isAllowedPath(pathname)) {
      return NextResponse.next();
    }

    // Use getAuth now that clerkMiddleware ran
    const { userId } = getAuth(req as any);

    // Unauthenticated -> redirect to sign-in with redirect back.
    if (!userId) {
      const signInUrl = new URL("/sign-in", req.nextUrl.origin);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Authenticated -> verify subscription/trial
    const hasActive = await userHasActiveSubscription(userId);

    if (hasActive) {
      return NextResponse.next();
    }

    // Signed-in but unsubscribed -> redirect to pricing
    const pricingUrl = new URL("/dashboard/pricing", req.nextUrl.origin);
    return NextResponse.redirect(pricingUrl);
  },
});

/**
 * Ensure middleware only runs for dashboard routes.
 * Leave API matcher lines out if you don't want to gate every API route.
 */
export const config = {
  matcher: ["/dashboard/:path*", /* optionally add api matcher like "/api/:path*" */],
};
