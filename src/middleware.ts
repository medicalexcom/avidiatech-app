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

/**
 * Public callback allowlist
 *
 * We intentionally allow unauthenticated access to the ingest callback endpoint because:
 * - The endpoint is protected by an HMAC signature check (x-avidiatech-signature + INGEST_SECRET)
 * - Requiring Clerk auth would block the ingest engine from calling back
 *
 * IMPORTANT:
 * - Do NOT put other API endpoints here unless they have their own strong auth.
 */
const PUBLIC_CALLBACK_PATHS = new Set<string>([
  "/api/v1/ingest/callback",
]);

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

const clerkWrappedHandler = clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname;

  // Allow public callback paths to bypass Clerk entirely
  if (PUBLIC_CALLBACK_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (
    !pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/settings") &&
    !pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  if (isAllowedPath(pathname)) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  // IMPORTANT: don't redirect API requests (frontend expects JSON)
  if (!userId) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // subscription gate only dashboard pages
  if (pathname.startsWith("/dashboard")) {
    const hasActive = await userHasActiveSubscription(userId);
    if (hasActive) return NextResponse.next();
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  /**
   * Option A: allow unauthenticated access to /api/v1/ingest/callback
   * (endpoint still verifies HMAC signature).
   *
   * We also attach the x-mw-version marker for debugging parity with other internal routes.
   */
  if (PUBLIC_CALLBACK_PATHS.has(pathname)) {
    const res = NextResponse.next();
    res.headers.set("x-mw-version", "src-middleware.ts::public-callback-allow::2026-01-03");
    return res;
  }

  /**
   * DEBUG / PROOF HEADER
   * This is safe: it does NOT expose secrets and only returns lengths + a version tag.
   * Remove once verified.
   */
  const isProbePath =
    pathname.startsWith("/api/v1/ingest") ||
    pathname.startsWith("/api/v1/pipeline");

  if (isProbePath) {
    const provided = (req.headers.get("x-service-api-key") || "").toString();
    const expected = (process.env.PIPELINE_INTERNAL_SECRET || "").toString();

    // Always respond with a marker header so we can prove THIS middleware is running.
    // We do not early-return here; we attach the header to whatever response we produce.
    const marker = "src-middleware.ts::internal-bypass-probe::2026-01-01";

    // Implement the internal bypass (and better errors) while we're here:
    // - provided + missing expected => 500
    // - provided + match => bypass Clerk
    // - provided + mismatch => 401
    if (provided && !expected) {
      const res = NextResponse.json(
        { error: "server_misconfigured_internal_secret" },
        { status: 500 }
      );
      res.headers.set("x-mw-version", marker);
      res.headers.set("x-mw-provided-key-len", String(provided.length));
      res.headers.set("x-mw-expected-key-len", String(expected.length));
      res.headers.set("x-mw-internal-path", "1");
      return res;
    }

    if (provided && expected && provided === expected) {
      const res = NextResponse.next();
      res.headers.set("x-mw-version", marker);
      res.headers.set("x-mw-provided-key-len", String(provided.length));
      res.headers.set("x-mw-expected-key-len", String(expected.length));
      res.headers.set("x-mw-internal-path", "1");
      res.headers.set("x-mw-internal-auth", "1");
      return res;
    }

    if (provided) {
      const res = NextResponse.json({ error: "unauthorized" }, { status: 401 });
      res.headers.set("x-mw-version", marker);
      res.headers.set("x-mw-provided-key-len", String(provided.length));
      res.headers.set("x-mw-expected-key-len", String(expected.length));
      res.headers.set("x-mw-internal-path", "1");
      res.headers.set("x-mw-internal-auth", "0");
      return res;
    }

    // No header: fall through to Clerk, but still add the marker header by wrapping.
    // (We can't directly mutate the response returned by clerkWrappedHandler later unless we
    //   capture it; so we just fall through and let Clerk respond. You can still prove
    //   this middleware is running by making a request WITH any x-service-api-key header.)
  }

  // Delegate to Clerk-wrapped handler for all other matched routes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await clerkWrappedHandler(req as any, undefined as any);
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/api/:path*"],
};
