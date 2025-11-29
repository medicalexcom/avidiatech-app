import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, getAuth, clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET, { apiVersion: "2022-11-15" }) : null;

// Allowlist for public routes / API used previously
const ALLOWLIST = [
  "/dashboard",                  // allow dashboard shell
  "/dashboard/pricing",
  "/dashboard/account",
  "/dashboard/organization",
  "/api/checkout/session",
  "/api/billing/portal",
  "/api/webhooks/stripe",
  "/api/subscription/status",
  // Note: do not add robot endpoint to ALLOWLIST unless you want it publicly callable
];

function isAllowedPath(pathname: string) {
  if (ALLOWLIST.includes(pathname)) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname.startsWith("/favicon.ico")) return true;
  return false;
}

/**
 * Parse OWNER_EMAILS env var into a Set of normalized emails.
 * OWNER_EMAILS expected as CSV, e.g. "regis@avidiatech.com,cofounder@avidiatech.com"
 */
function getOwnerEmailsSet() {
  const raw = process.env.OWNER_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Returns true if the user should be treated as having an active subscription.
 * Owners (in OWNER_EMAILS or marked in Clerk metadata) bypass Stripe.
 */
async function userHasActiveSubscription(userId: string | undefined) {
  if (!userId) return false;

  // First, try to fetch Clerk user. If that fails, fall back to Stripe logic below.
  let clerkUser;
  try {
    clerkUser = await clerkClient.users.getUser(userId);
  } catch (err) {
    console.warn("Unable to fetch Clerk user:", err);
  }

  // OWNER BY EMAIL LIST (env)
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

  // OWNER BY CLERK METADATA (optional)
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

  // If Stripe is not configured, treat as no subscription (conservative)
  if (!stripe) {
    console.warn("Stripe key not set; treating as no subscription.");
    return false;
  }

  // If a stripe customer id is stored in Clerk metadata, use it. Otherwise try email lookup.
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

const clerkMw = clerkMiddleware();

export default async function middleware(req: NextRequest, ev: any) {
  const pathname = req.nextUrl.pathname;

  // Robot token bypass: allow a server-side robot to call specific API routes without Clerk auth.
  // The robot must send x-avidiatech-robot-token === process.env.ROBOT_TOKEN.
  // This check runs BEFORE clerkMiddleware so robot calls are not intercepted.
  try {
    const ROBOT_TOKEN = process.env.ROBOT_TOKEN || "";
    if (ROBOT_TOKEN && pathname.startsWith("/api/v1/ingest/robot")) {
      const incoming = req.headers.get("x-avidiatech-robot-token") || "";
      if (incoming && incoming === ROBOT_TOKEN) {
        // authorized robot — allow through
        return NextResponse.next();
      }
      // If token present but invalid, return 401 immediately (avoid redirect)
      if (incoming) {
        return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      // If no token provided and endpoint is robot path, fall through to standard auth (so we don't inadvertently open it)
    }
  } catch (err) {
    console.warn("robot token check failed in middleware:", err);
  }

  // Run Clerk middleware (keeps existing auth behavior)
  try {
    const maybeResponse = await (clerkMw as any)(req, ev);
    if (maybeResponse) return maybeResponse;
  } catch (err) {
    console.warn("clerkMiddleware invocation warning:", err);
  }

  if (!pathname.startsWith("/dashboard") && !pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (isAllowedPath(pathname)) {
    return NextResponse.next();
  }

  const { userId } = getAuth(req as any);

  if (!userId) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const hasActive = await userHasActiveSubscription(userId);
  if (hasActive) return NextResponse.next();

  // Signed-in but unsubscribed -> redirect deep routes to dashboard root (so shell renders)
  const dashboardRoot = new URL("/dashboard", req.nextUrl.origin);
  return NextResponse.redirect(dashboardRoot);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
