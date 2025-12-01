// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";

/**
 * Public routes — no auth required
 * Note: Our matcher (below) only sends /dashboard/* and /api/* through this middleware,
 * but we keep an explicit allowlist for specific API paths that must stay public.
 */
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  // webhook/health endpoints that must remain public
  "/api/webhooks(.*)",
  "/api/health",
]);

/** Owner emails env helper (comma-separated) */
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
 * Owner bypass:
 * - If a user's primary email is in OWNER_EMAILS env, they're owner.
 * - Or if Clerk metadata role is "owner".
 */
async function isOwner(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const user = await clerkClient.users.getUser(userId);
    const ownerEmails = getOwnerEmailsSet();

    // Email-based owner bypass
    const emails = user.emailAddresses?.map((e) => e?.emailAddress?.toLowerCase()).filter(Boolean) ?? [];
    if (emails.some((e) => ownerEmails.has(e!))) return true;

    // Metadata-based owner bypass
    const priv = (user.privateMetadata ?? {}) as Record<string, any>;
    const pub = (user.publicMetadata ?? {}) as Record<string, any>;
    if (priv.role === "owner" || pub.role === "owner") return true;
  } catch (err) {
    // Non-fatal: treat as not owner
    console.warn("Owner check failed:", err);
  }
  return false;
}

/**
 * NOTE on subscriptions:
 * Next.js Middleware runs on the Edge runtime; Stripe's Node SDK is not edge-compatible.
 * If you must gate /dashboard/* by active subscription, implement a small server API
 * (Node runtime) like /api/internal/sub-status that checks Stripe, then call it here.
 * For now we leave subscription enforcement to server routes/pages and keep middleware simple.
 */

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId } = auth();

  // Only guard dashboard and API routes (matcher below ensures only these hit middleware)
  const pathname = req.nextUrl.pathname;

  // Public routes are allowed through without auth
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Require auth for everything else under /dashboard/* and /api/*
  auth().protect();

  // Owner bypass (allow through regardless of subscription)
  const owner = await isOwner(userId);
  if (owner) {
    return NextResponse.next();
  }

  // If you want additional gating on dashboard routes (e.g., subscription),
  // redirect non-owners to /dashboard (or pricing) here. For now, just pass through.
  return NextResponse.next();
});

/**
 * IMPORTANT:
 * Ensure this matcher exists so middleware applies to the routes that call auth()
 * (your API routes and dashboard pages).
 */
export const config = {
  matcher: [
    // Only run on /dashboard/* and /api/* (keeps public pages untouched)
    "/dashboard/:path*",
    "/api/:path*",
  ],
};
