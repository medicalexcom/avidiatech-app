import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, getAuth, clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET, { apiVersion: "2022-11-15" }) : null;

/**
 * Very conservative allowlist:
 * Only these UI/API routes are allowed without an active subscription/trial.
 * NOTE: we added "/dashboard" here so the shell (topbar/sidebar) can render and the modal can overlay.
 */
const ALLOWLIST = [
  "/dashboard",                  // allow dashboard shell so modal can overlay it
  "/dashboard/pricing",
  "/dashboard/account",
  "/dashboard/organization",
  "/api/checkout/session",
  "/api/billing/portal",
  "/api/webhooks/stripe",
  "/api/subscription/status",
];

/** Helper to determine whether a pathname is allowed without an active subscription */
function isAllowedPath(pathname: string) {
  if (ALLOWLIST.includes(pathname)) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname.startsWith("/favicon.ico")) return true;
  return false;
}

/** Check via Clerk metadata/Stripe if user has trialing or active subscription */
async function userHasActiveSubscription(userId: string | undefined) {
  if (!userId) return false;
  if (!stripe) {
    console.warn("Stripe key not set; treating as no subscription.");
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
    const subs = await stripe.subscriptions.list({ customer: customerId, limit: 50 });
    if (subs.data && subs.data.length > 0) {
      for (const s of subs.data) {
        if (s.status === "trialing" || s.status === "active") {
          return true;
        }
      }
    }
  } catch (err) {
    console.warn("Stripe subscriptions lookup failed:", err);
    // fail-safe: treat as no subscription
  }

  return false;
}

/** Compose Clerk middleware then enforce our gate */
const clerkMw = clerkMiddleware();

export default async function middleware(req: NextRequest, ev: any) {
  // Run Clerk middleware first (so getAuth works)
  try {
    const maybeResponse = await (clerkMw as any)(req, ev);
    if (maybeResponse) return maybeResponse;
  } catch (err) {
    console.warn("clerkMiddleware invocation warning:", err);
  }

  const pathname = req.nextUrl.pathname;

  // Only protect dashboard/UI and API routes
  if (!pathname.startsWith("/dashboard") && !pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow whitelisted paths without subscription (includes "/dashboard" now)
  if (isAllowedPath(pathname)) {
    return NextResponse.next();
  }

  // Now safe to call getAuth
  const { userId } = getAuth(req as any);

  if (!userId) {
    // Not signed in → force sign-in
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Signed-in → check subscription/trial
  const hasActive = await userHasActiveSubscription(userId);
  if (hasActive) return NextResponse.next();

  // Signed-in but unsubscribed → restrict access to non-allowed paths
  // For non-allowed routes, we redirect to the dashboard root where the modal will show
  const dashboardRoot = new URL("/dashboard", req.nextUrl.origin);
  return NextResponse.redirect(dashboardRoot);
}

/** Middleware matches both dashboard and API routes so server endpoints are blocked as well */
export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
