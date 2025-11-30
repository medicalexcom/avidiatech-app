import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, getAuth, clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET, { apiVersion: "2022-11-15" }) : null;

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
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname.startsWith("/favicon.ico")) return true;
  return false;
}

function getOwnerEmailsSet() {
  const raw = process.env.OWNER_EMAILS || "";
  return new Set(raw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean));
}

async function userHasActiveSubscription(userId?: string) {
  if (!userId) return false;
  let clerkUser;
  try { clerkUser = await clerkClient.users.getUser(userId); } catch (e) { console.warn("clerk user fetch failed", e); }
  try {
    const ownerEmails = getOwnerEmailsSet();
    if (ownerEmails.size > 0 && clerkUser?.emailAddresses?.length) {
      for (const e of clerkUser.emailAddresses) {
        if (e?.emailAddress && ownerEmails.has(e.emailAddress.toLowerCase())) {
          console.info("Owner bypass via OWNER_EMAILS", e.emailAddress);
          return true;
        }
      }
    }
  } catch (e) { console.warn("owner email check failed", e); }

  try {
    const privateMeta = (clerkUser?.privateMetadata as any) || {};
    const publicMeta = (clerkUser?.publicMetadata as any) || {};
    if (privateMeta?.role === "owner" || publicMeta?.role === "owner") return true;
  } catch (e) { console.warn("metadata owner check failed", e); }

  if (!stripe) return false;

  const stripeCustomerId = (clerkUser?.privateMetadata as any)?.stripeCustomerId || (clerkUser?.publicMetadata as any)?.stripeCustomerId;
  let customerId = stripeCustomerId;
  if (!customerId) {
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
    if (email) {
      try {
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length > 0) customerId = customers.data[0].id;
      } catch (e) { console.warn("stripe customer lookup failed", e); }
    }
  }
  if (!customerId) return false;

  try {
    const subs = await stripe.subscriptions.list({ customer: customerId, limit: 50 });
    if (subs.data?.length) {
      for (const s of subs.data) {
        if (s.status === "trialing" || s.status === "active") return true;
      }
    }
  } catch (e) { console.warn("stripe subscriptions lookup failed", e); }
  return false;
}

const clerkMw = clerkMiddleware();

export default async function middleware(req: NextRequest, ev: any) {
  // Debug: log that middleware file executed and which path is requested
  console.log("[middleware] incoming", req.nextUrl.pathname);

  try {
    // run Clerk middleware first (it may return a Response)
    const maybeResponse = await (clerkMw as any)(req, ev);
    if (maybeResponse) {
      console.log("[middleware] clerkMiddleware returned a Response for", req.nextUrl.pathname);
      return maybeResponse;
    }
    console.log("[middleware] clerkMiddleware completed for", req.nextUrl.pathname);
  } catch (err) {
    console.warn("[middleware] clerkMiddleware invocation warning:", err);
  }

  const pathname = req.nextUrl.pathname;

  // Keep original allowlist logic
  if (!pathname.startsWith("/dashboard") && !pathname.startsWith("/api")) {
    return NextResponse.next();
  }
  if (isAllowedPath(pathname)) return NextResponse.next();

  const { userId } = getAuth(req as any);
  console.log("[middleware] getAuth userId:", userId);

  if (!userId) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("redirect", pathname);
    console.log("[middleware] redirecting to sign-in for", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const hasActive = await userHasActiveSubscription(userId);
  console.log("[middleware] userHasActiveSubscription:", hasActive);
  if (hasActive) return NextResponse.next();

  const dashboardRoot = new URL("/dashboard", req.nextUrl.origin);
  return NextResponse.redirect(dashboardRoot);
}

/**
 * Debugging: broaden matcher while investigating.
 * After you confirm middleware runs and auth() works, tighten this matcher back to ["/dashboard/:path*", "/api/:path*"]
 */
export const config = {
  // Broad matcher for debugging to ensure middleware runs for all app routes except static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
