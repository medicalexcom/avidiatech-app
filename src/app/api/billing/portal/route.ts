import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Billing Portal session for the current user and returns the URL.
 *
 * Customer ID resolution order:
 *  1. Clerk user privateMetadata.stripeCustomerId
 *  2. Clerk user publicMetadata.stripeCustomerId
 *  3. tenant_subscriptions.stripe_customer_id in Supabase
 *  4. Stripe customer lookup by email
 *
 * If no Stripe customer is found (e.g. manually-inserted subscription row, owner bypass),
 * returns a redirect to the pricing page instead so the user can subscribe via Stripe.
 */

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET
  ? new Stripe(STRIPE_SECRET, { apiVersion: "2024-06-20" })
  : null;

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
    }

    // ── 1. Fetch Clerk user for metadata + email ─────────────────────────────
    let clerkUser: any = null;
    try {
      const client = await clerkClient();
      clerkUser = await client.users.getUser(userId);
    } catch (err) {
      console.warn("[billing/portal] Clerk user fetch failed:", err);
    }

    const email = clerkUser?.emailAddresses?.[0]?.emailAddress as string | undefined;

    // ── 2. Find Stripe customer ID (multiple sources) ────────────────────────
    let customerId: string | undefined =
      (clerkUser?.privateMetadata as any)?.stripeCustomerId ||
      (clerkUser?.publicMetadata as any)?.stripeCustomerId;

    // 2b. Supabase: tenant_subscriptions.stripe_customer_id
    if (!customerId) {
      try {
        const supabase = getServiceSupabaseClient();

        // Resolve tenantId via team_members first
        let tenantId = userId;
        const { data: membership } = await supabase
          .from("team_members")
          .select("tenant_id")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();
        if (membership?.tenant_id) tenantId = membership.tenant_id;

        const { data: sub } = await supabase
          .from("tenant_subscriptions")
          .select("stripe_customer_id, stripe_subscription_id")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (sub?.stripe_customer_id) {
          customerId = sub.stripe_customer_id;
        }
      } catch (err) {
        console.warn("[billing/portal] Supabase customer ID lookup failed:", err);
      }
    }

    // 2c. Stripe: look up by email
    if (!customerId && email) {
      try {
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        }
      } catch (err) {
        console.warn("[billing/portal] Stripe customer lookup by email failed:", err);
      }
    }

    // ── 3. No customer found → redirect to pricing page ─────────────────────
    if (!customerId) {
      // Owner or manually-inserted subscription — send them to pricing
      // so they can go through the real Stripe checkout flow
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://avidiatech.com";
      return NextResponse.json({
        url: `${appUrl}/dashboard/pricing`,
        reason: "no_stripe_customer",
      });
    }

    // ── 4. Create Stripe Billing Portal session ──────────────────────────────
    const appUrl    = process.env.NEXT_PUBLIC_APP_URL || "https://avidiatech.com";
    const returnUrl = `${appUrl}/settings/billing`;

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer:   customerId,
        return_url: returnUrl,
      });
      return NextResponse.json({ url: session.url });
    } catch (err: any) {
      console.error("[billing/portal] Stripe portal session creation failed:", err.message);
      return NextResponse.json(
        { error: "stripe_portal_failed", details: err.message },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error("[billing/portal] unexpected error:", err);
    return NextResponse.json({ error: "unexpected", details: String(err?.message ?? err) }, { status: 500 });
  }
}
