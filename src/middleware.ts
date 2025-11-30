// NOTE: we purposely avoid a static import from "@clerk/nextjs/server" at top-level
// so we can normalize environment variable names (CLERK_SECRET_KEY -> CLERK_SECRET)
// before Clerk initializes. This ensures clerkMiddleware() and getAuth() work even
// if the env was set under CLERK_SECRET_KEY.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Stripe from "stripe";

/* Normalize Clerk env var names before loading @clerk/nextjs/server.
   Many deployments name the server secret CLERK_SECRET or CLERK_SECRET_KEY.
   Set process.env.CLERK_SECRET to ensure the Clerk package sees it.
*/
(function normalizeClerkEnv() {
  // prefer the canonical name if already present
  if (!process.env.CLERK_SECRET) {
    // Accept either CLERK_SECRET_KEY or CLERK_SECRET (some naming variants)
    const candidate = process.env.CLERK_SECRET_KEY || process.env.CLERK_SECRET;
    if (candidate) {
      process.env.CLERK_SECRET = candidate;
      // optional: also set CLERK_API_KEY if provided under an alternate name
      if (!process.env.CLERK_API_KEY && (process.env.CLERK_API_KEY_KEY || process.env.CLERK_API)) {
        process.env.CLERK_API_KEY = process.env.CLERK_API_KEY_KEY || process.env.CLERK_API;
      }
    }
  }

  // Ensure NEXT_PUBLIC_CLERK_FRONTEND_API exists for client init if present under another name
  if (!process.env.NEXT_PUBLIC_CLERK_FRONTEND_API && process.env.NEXT_PUBLIC_CLERK_FRONTEND) {
    process.env.NEXT_PUBLIC_CLERK_FRONTEND_API = process.env.NEXT_PUBLIC_CLERK_FRONTEND;
  }
})();

// Now require clerk server helpers (after env normalization).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { clerkMiddleware, getAuth, clerkClient } = require("@clerk/nextjs/server");

/**
 * NOTE: This file must live at src/middleware.ts for Next to pick it up when using the src/ app dir.
 * The rest of the file preserves your subscription/allowlist logic.
 */

// Stripe init (optional)
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET, { apiVersion: "2022-11-15" }) : null;

// Routes that should be public / allowed even without subscription
const ALLOWLIST = [
  "/dashboard", // allow dashboard shell
  "/dashboard/pricing",
  "/dashboard/account",
  "/dashboard/organization",
  "/api/checkout/session",
  "/api/billing/portal",
  "/api/webhooks/stripe",
  "/api/subscription/status",
];

function isAllowedPath(pathname: string) {
  if (ALLOWLIST.includes(pathname)) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname.startsWith("/favicon.ico"))
    return true;
  return false;
}

function getOwnerEmailsSet() {
  const raw = process.env.OWNER_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

async function userHasActiveSubscription(userId: string | undefined) {
  if (!userId) return false;

  let clerkUser;
  try {
    clerkUser = await clerkClient.users.getUser(userId);
  } catch (err) {
    console.warn("Unable to fetch Clerk user:", err);
  }

  try {
    const ownerEmails = getOwnerEmailsSet();
    if (ownerEmails.size > 0 && clerkUser?.emailAddresses?.length) {
      for (const e of clerkUser.emailAddresses) {
        if (e?.emailAddress && ownerEmails.has(e.emailAddress.toLowerCase())) {
          console.info("Owner detected by email list, bypassing Stripe:", e.emailAddress);
          return true;
        }
      }
    }
  } catch (err) {
    console.warn("Owner email check failed:", err);
  }

  try {
    const privateMeta = (clerkUser?.privateMetadata as any) || {};
    const publicMeta = (clerkUser?.publicMetadata as any) || {};
    if (privateMeta?.role === "owner" || publicMeta?.role === "owner") {
      console.info("Owner detected by Clerk metadata; bypassing Stripe for user:", userId);
      return true;
    }
  } catch (err) {
    console.warn("Clerk metadata owner check failed:", err);
  }

  if (!stripe) {
    console.warn("Stripe key not set; treating as no subscription.");
    return false;
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
  }

  return false;
}

// Create the clerk middleware instance once
const clerkMw = clerkMiddleware();

/**
 * Primary middleware exported function.
 * We call clerkMiddleware() first so Clerk sets up the auth session context.
 * Then we run our app-specific allowlist / subscription enforcement.
 */
export default async function middleware(req: NextRequest, ev: any) {
  // 1) run Clerk middleware early (it may return a Response for auth flows)
  try {
    const maybeResponse = await (clerkMw as any)(req, ev);
    if (maybeResponse) return maybeResponse;
  } catch (err) {
    // Do not fail the request if Clerk middleware throws — log and continue to safe path
    console.warn("clerkMiddleware invocation warning:", err);
  }

  const pathname = req.nextUrl.pathname;

  // Only guard dashboard and API routes here (matcher controls which requests hit this middleware)
  if (!pathname.startsWith("/dashboard") && !pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow explicitly public paths (shell + sign-in + webhooks, etc.)
  if (isAllowedPath(pathname)) {
    return NextResponse.next();
  }

  // Now that clerkMiddleware ran, getAuth should succeed (it reads the context clerkMiddleware added)
  const { userId } = getAuth(req as any);

  if (!userId) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check subscription / owner bypass
  const hasActive = await userHasActiveSubscription(userId);
  if (hasActive) return NextResponse.next();

  // Signed-in but unsubscribed -> redirect deep dashboard routes to dashboard root (so the shell renders)
  const dashboardRoot = new URL("/dashboard", req.nextUrl.origin);
  return NextResponse.redirect(dashboardRoot);
}

/**
 * Ensure matcher covers the routes that call auth().
 * Keep minimal set for performance. If you have other pages that call auth() directly, add them here.
 */
export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"]
};







export const config = {
  matcher: ["/:path*"] // TEMPORARY broad matcher for debugging only — revert after diagnosis
};
console.log("[DIAG-middleware] incoming", process.env.VERCEL && process.env.VERCEL ? "VERCEL" : "local");


