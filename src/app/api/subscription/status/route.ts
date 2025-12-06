import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
  : null;

/**
 * Helper: parse OWNER_EMAILS from env and return a Set of lowercase emails.
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

export async function GET(req: Request) {
  try {
    // Use safeGetAuth inside the handler scope
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) return NextResponse.json({ active: false, reason: "unauthenticated" }, { status: 200 });

    // Try to fetch Clerk user (require dynamically to avoid build-time init)
    let clerkUser: any | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { clerkClient } = require("@clerk/nextjs/server");
      clerkUser = await clerkClient.users.getUser(userId);
    } catch (err) {
      // Clerk may be unavailable in some build contexts; log and continue.
      console.warn("Failed to fetch clerk user (clerkClient unavailable or error):", String(err));
      clerkUser = undefined;
    }

    // Owner detection: by OWNER_EMAILS env or Clerk metadata
    try {
      const ownerEmails = getOwnerEmailsSet();
      if (ownerEmails.size > 0 && clerkUser?.emailAddresses?.length) {
        for (const e of clerkUser.emailAddresses) {
          if (e?.emailAddress && ownerEmails.has(e.emailAddress.toLowerCase())) {
            return NextResponse.json({ active: true, status: "owner", reason: "owner_email" }, { status: 200 });
          }
        }
      }

      const privateMeta = (clerkUser?.privateMetadata as any) || {};
      const publicMeta = (clerkUser?.publicMetadata as any) || {};
      if (privateMeta?.role === "owner" || publicMeta?.role === "owner") {
        return NextResponse.json({ active: true, status: "owner", reason: "owner_metadata" }, { status: 200 });
      }
    } catch (err) {
      console.warn("Owner detection failed:", err);
    }

    // Non-owner flow: fallback to Stripe subscription lookup
    if (!stripe) {
      console.warn("Stripe key not set; treating as no subscription.");
      return NextResponse.json({ active: false, reason: "no_stripe" }, { status: 200 });
    }

    // Find a stripe customer id from Clerk metadata or by email
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
          console.warn("Stripe customer lookup by email failed:", err);
        }
      }
    }

    if (!customerId) return NextResponse.json({ active: false, reason: "no_customer" }, { status: 200 });

    try {
      const subs = await stripe.subscriptions.list({ customer: customerId, limit: 50 });
      if (subs.data && subs.data.length > 0) {
        for (const s of subs.data) {
          if (s.status === "trialing" || s.status === "active") {
            return NextResponse.json({ active: true, status: s.status }, { status: 200 });
          }
        }
      }
    } catch (err) {
      console.warn("Stripe subscriptions lookup failed:", err);
      return NextResponse.json({ active: false, reason: "stripe_lookup_failed" }, { status: 200 });
    }

    return NextResponse.json({ active: false, reason: "no_active_subscription" }, { status: 200 });
  } catch (err: any) {
    console.error("subscription status route error:", err);
    return NextResponse.json({ active: false, reason: "internal_error" }, { status: 500 });
  }
}
