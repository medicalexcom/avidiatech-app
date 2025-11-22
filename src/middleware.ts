import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET, { apiVersion: "2022-11-15" }) : null;

/**
 * Allowed paths under /dashboard for unauthenticated/unsubscribed users.
 * - Keep these as minimal as possible per your requirement.
 */
const ALLOWLIST = [
  "/dashboard/pricing",            // plan selection (required)
  "/dashboard/account",            // optional
  "/dashboard/organization",       // optional
  "/api/checkout/session",         // create checkout session (stripe)
  "/api/billing/portal",           // create billing portal session
  "/api/webhooks/stripe",          // stripe webhooks (must be accessible)
];

/**
 * Helper: is the incoming pathname allowed without an active subscription?
 */
function isAllowedPath(pathname: string) {
  // exact match allowlist
  if (ALLOWLIST.includes(pathname)) return true;

  // allow webhook /api paths (prefix)
  if (pathname.startsWith("/api/webhooks/")) return true;

  // keep public auth and static assets accessible
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname.startsWith("/favicon.ico")) return true;

  return false;
}

/**
 * Checks whether the given Clerk user has an active subscription or active trial.
 * Strategy:
 * 1) Prefer a stored stripeCustomerId in Clerk privateMetadata/publicMetadata.
 * 2) Fallback: try to find a Stripe customer using the Clerk user's primary email.
 * 3) Query Stripe subscriptions for that customer and determine status.
 *
 * Returns true if any subscription is in 'active' or 'trialing'.
 */
async function userHasActiveSubscription(userId: string | undefined) {
  if (!userId) return false;
  if (!stripe) {
    // If Stripe isn't configured, deny access by default (fail-safe)
    console.warn("Stripe secret key not configured; treating as no active subscription.");
    return false;
  }

  let clerkUser;
  try {
    clerkUser = await clerkClient.users.getUser(userId);
  } catch (err) {
    console.warn("Unable to fetch Clerk user:", err);
  }

  // 1) Prefer stripeCustomerId stored in Clerk privateMetadata
  const stripeCustomerId =
    (clerkUser?.privateMetadata as any)?.stripeCustomerId ||
    (clerkUser?.publicMetadata as any)?.stripeCustomerId ||
    undefined;

  let customerId = stripeCustomerId;

  // 2) Fallback: search Stripe customers by email
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

  if (!customerId) {
    return false;
  }

  // 3) List subscriptions for this customer and check status
  try {
    const subs = await stripe.subscriptions.list({ customer: customerId, limit: 20 });
    if (subs.data && subs.data.length > 0) {
      for (const s of subs.data) {
        // treat 'trialing' and 'active' as allowed
        if (s.status === "trialing" || s.status === "active") {
          return true;
        }
      }
    }
  } catch (err) {
    console.warn("Stripe subscriptions list failed:", err);
    // On failure treat as no subscription (safer to block)
  }

  return false;
}

/**
 * Middleware entrypoint
 *
 * - runs for /dashboard routes via matcher (see config below)
 * - redirects unauthorized users to sign-in or pricing page
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only enforce for /dashboard prefix (matcher ensures this), but guard anyway.
  if (!pathname.startsWith("/dashboard") && !pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allowlist: if the exact path is permitted, pass through.
  if (isAllowedPath(pathname)) {
    return NextResponse.next();
  }

  // Auth check via Clerk
  const { userId } = getAuth(req as any);

  // If unauthenticated -> redirect to sign-in with redirect back
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Authenticated: verify subscription/trial
  const hasActive = await userHasActiveSubscription(userId);

  if (hasActive) {
    return NextResponse.next();
  }

  // If authenticated but no active subscription/trial -> redirect to pricing
  const pricingUrl = new URL("/dashboard/pricing", req.nextUrl.origin);
  return NextResponse.redirect(pricingUrl);
}

/**
 * Only run middleware for dashboard routes (and API endpoints that may need gating).
 * Adjust the matcher if your app organizes routes differently.
 */
export const config = {
  matcher: [
    /*
     * Match all dashboard routes
     * - /dashboard
     * - /dashboard/*
     */
    "/dashboard/:path*",
    /*
     * Optionally match API routes you want to gate (if you need to block server endpoints).
     * If you only want UI routes protected, remove the API lines.
     */
    // "/api/:path*",
  ],
};
