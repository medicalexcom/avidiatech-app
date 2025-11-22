import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, getAuth, clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET, { apiVersion: "2022-11-15" }) : null;

/**
 * Allowed paths under /dashboard for unauthenticated / unsubscribed users.
 * Keep this minimal according to your policy.
 */
const ALLOWLIST = [
  "/dashboard/pricing",
  "/dashboard/account",
  "/dashboard/organization",
  "/api/checkout/session",
  "/api/billing/portal",
  "/api/webhooks/stripe",
];

/** Helper to determine whether a pathname is allowed without an active subscription */
function isAllowedPath(pathname: string) {
  if (ALLOWLIST.includes(pathname)) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname.startsWith("/favicon.ico")) return true;
  return false;
}

/**
 * Server-side check: does the Clerk user have an active subscription or trial?
 * Strategy:
 * 1) Prefer stripeCustomerId stored in Clerk privateMetadata.
 * 2) Fallback to searching Stripe by email.
 * 3) Query Stripe subscriptions for that customer and treat 'trialing' or 'active' as allowed.
 */
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
 * Compose Clerk middleware and then run our gate logic.
 *
 * We call clerkMiddleware() and invoke the returned middleware function to ensure Clerk initializes,
 * then run our own checks using getAuth(). Some Clerk versions expose different typings for the middleware,
 * so we cast to `any` when invoking the returned function to avoid a TS typing error.
 */
const clerkMw = clerkMiddleware();

export default async function middleware(req: NextRequest, ev: any) {
  // First run Clerk's middleware so getAuth() will work
  try {
    // clerkMw is a NextMiddleware; some Clerk versions return a function with signature (req, ev).
    // Cast to any to call it regardless of exact type signature.
    const maybeResponse = await (clerkMw as any)(req, ev);
    if (maybeResponse) {
      // If clerkMiddleware returned a Response (e.g., redirect), pass it through.
      return maybeResponse;
    }
  } catch (err) {
    // If Clerk middleware throws, log and continue to our gate logic (we will block by default if needed).
    console.warn("clerkMiddleware invocation warning:", err);
  }

  const pathname = req.nextUrl.pathname;

  // If the request is unrelated to dashboard/API gating, let it pass.
  if (!pathname.startsWith("/dashboard") && !pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow explicit allowlist paths (pricing, billing endpoints, webhooks, sign-in/up)
  if (isAllowedPath(pathname)) {
    return NextResponse.next();
  }

  // Now it's safe to call getAuth because clerkMw already ran
  const { userId } = getAuth(req as any);

  // Unauthenticated -> redirect to sign-in with redirect back to original pathname
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
}

/**
 * Only run middleware for dashboard routes. If you need to gate API endpoints too,
 * add "/api/:path*" to the matcher.
 */
export const config = {
  matcher: ["/dashboard/:path*"],
};
