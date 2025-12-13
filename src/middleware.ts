import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Stripe from "stripe";
import { clerkMiddleware, clerkClient } from "@clerk/nextjs/server";

/* Normalize Clerk env var names before loading @clerk/nextjs/server. */
(function normalizeClerkEnv() {
  if (!process.env.CLERK_SECRET) {
    const candidate = process.env.CLERK_SECRET_KEY || process.env.CLERK_SECRET;
    if (candidate) {
      process.env.CLERK_SECRET = candidate;
      if (
        !process.env.CLERK_API_KEY &&
        (process.env.CLERK_API_KEY_KEY || process.env.CLERK_API_KEY)
      ) {
        process.env.CLERK_API_KEY =
          process.env.CLERK_API_KEY_KEY || process.env.CLERK_API_KEY;
      }
    }
  }
  if (
    !process.env.NEXT_PUBLIC_CLERK_FRONTEND_API &&
    process.env.NEXT_PUBLIC_CLERK_FRONTEND
  ) {
    process.env.NEXT_PUBLIC_CLERK_FRONTEND_API =
      process.env.NEXT_PUBLIC_CLERK_FRONTEND;
  }
})();

/* Stripe init (optional) */
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET
  ? new Stripe(STRIPE_SECRET, { apiVersion: "2024-06-20" })
  : null;

/* allowlist and helpers (unchanged logic) */
const ALLOWLIST = [
  "/dashboard",
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
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up"))
    return true;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon.ico")
  )
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

async function userHasActiveSubscription(userId: string | null | undefined) {
  if (!userId) return false;

  let clerkUser: any;
  try {
    const client = await clerkClient();
    clerkUser = await client.users.getUser(userId);
  } catch (err) {
    console.warn("Unable to fetch Clerk user:", err);
  }

  try {
    const ownerEmails = getOwnerEmailsSet();
    if (ownerEmails.size > 0 && clerkUser?.emailAddresses?.length) {
      for (const e of clerkUser.emailAddresses) {
        if (
          e?.emailAddress &&
          ownerEmails.has(String(e.emailAddress).toLowerCase())
        ) {
          console.info(
            "Owner detected by email list, bypassing Stripe:",
            e.emailAddress
          );
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
      console.info(
        "Owner detected by Clerk metadata; bypassing Stripe for user:",
        userId
      );
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
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      limit: 50,
    });
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

/**
 * IMPORTANT: This must be the exported middleware, using clerkMiddleware(),
 * so Clerk can detect it and allow auth() in server components/routes.
 */
export default clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname;

  // Only guard dashboard and API routes here (matcher controls which requests hit this middleware)
  if (!pathname.startsWith("/dashboard") && !pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow explicitly public paths
  if (isAllowedPath(pathname)) {
    return NextResponse.next();
  }

  // Clerk session
  const { userId } = auth();

  if (!userId) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Only subscription-gate dashboard pages; allow API access as-is once authenticated
  if (pathname.startsWith("/dashboard")) {
    const hasActive = await userHasActiveSubscription(userId);
    if (hasActive) return NextResponse.next();

    // Signed-in but unsubscribed -> redirect deep dashboard routes to dashboard root
    const dashboardRoot = new URL("/dashboard", req.nextUrl.origin);
    return NextResponse.redirect(dashboardRoot);
  }

  return NextResponse.next();
});

/* Narrow matcher for production */
export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
