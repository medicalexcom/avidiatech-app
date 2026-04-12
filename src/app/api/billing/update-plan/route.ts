import { NextResponse } from "next/server";
import Stripe from "stripe";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * POST /api/billing/update-plan
 *
 * Upgrades or downgrades the current user's Stripe subscription to a new plan.
 * The change takes effect immediately (prorated).
 *
 * Request body: { plan: "starter" | "growth" | "pro", billing?: "monthly" | "yearly" }
 *
 * Flow:
 *  1. Resolve user → Stripe customer
 *  2. Find the active Stripe subscription
 *  3. Swap the price item to the new plan's price ID
 *  4. Update tenant_subscriptions in Supabase with new plan + quotas
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

const PLAN_QUOTAS: Record<string, { ingestion: number | null; seo: number | null; variants: number | null; match: number | null }> = {
  starter: { ingestion: 500,  seo: 500,  variants: 250,  match: 100  },
  growth:  { ingestion: 5000, seo: 5000, variants: 2500, match: 1000 },
  pro:     { ingestion: null, seo: null,  variants: null,  match: null },
};

function resolvePriceId(plan: string, billing: string): string | undefined {
  const planKey  = plan.toUpperCase();
  const billingKey = billing === "yearly" ? "YEARLY" : "MONTHLY";
  return (
    process.env[`STRIPE_PRICE_ID_${planKey}_${billingKey}`] ??
    process.env[`STRIPE_PRICE_ID_${planKey}`]
  );
}

export async function POST(req: Request) {
  try {
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const body    = await req.json().catch(() => ({}));
    const plan    = (body?.plan    ?? "").toString().toLowerCase();
    const billing = (body?.billing ?? "monthly").toString().toLowerCase();

    if (!["starter", "growth", "pro"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan. Must be starter, growth, or pro." }, { status: 400 });
    }

    const newPriceId = resolvePriceId(plan, billing);
    if (!newPriceId) {
      return NextResponse.json(
        { error: `No Stripe price ID configured for ${plan}/${billing}. Check environment variables.` },
        { status: 500 }
      );
    }

    // ── Resolve Stripe customer ──────────────────────────────────────────────
    let stripeCustomerId: string | undefined;
    try {
      const { clerkClient } = require("@clerk/nextjs/server");
      const clerkUser = await clerkClient.users.getUser(userId);
      stripeCustomerId =
        (clerkUser?.privateMetadata as any)?.stripeCustomerId ||
        (clerkUser?.publicMetadata  as any)?.stripeCustomerId;

      // Fallback: look up by email
      if (!stripeCustomerId) {
        const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
        if (email) {
          const customers = await stripe.customers.list({ email, limit: 1 });
          stripeCustomerId = customers.data[0]?.id;
        }
      }
    } catch (err) {
      console.error("update-plan: Clerk lookup failed:", err);
      return NextResponse.json({ error: "Failed to resolve Stripe customer" }, { status: 500 });
    }

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer found. Please complete checkout first." },
        { status: 400 }
      );
    }

    // ── Find active subscription ─────────────────────────────────────────────
    const subs = await stripe.subscriptions.list({ customer: stripeCustomerId, limit: 10 });
    const activeSub = subs.data.find((s) => ["active", "trialing"].includes(s.status));

    if (!activeSub) {
      return NextResponse.json(
        { error: "No active subscription found. Please subscribe first." },
        { status: 400 }
      );
    }

    const currentItemId = activeSub.items.data[0]?.id;
    if (!currentItemId) {
      return NextResponse.json({ error: "Could not resolve subscription item ID" }, { status: 500 });
    }

    // ── Swap price on Stripe ─────────────────────────────────────────────────
    const updatedSub = await stripe.subscriptions.update(activeSub.id, {
      proration_behavior: "create_prorations",
      items: [{ id: currentItemId, price: newPriceId }],
      metadata: { plan, billing, clerkUserId: userId },
    });

    // ── Update Supabase ──────────────────────────────────────────────────────
    const supabase  = getServiceSupabaseClient();
    const quotas    = PLAN_QUOTAS[plan] ?? PLAN_QUOTAS.starter;
    const periodEnd = new Date(updatedSub.current_period_end * 1000).toISOString();

    await supabase
      .from("tenant_subscriptions")
      .update({
        plan_name:          plan,
        status:             updatedSub.status,
        current_period_end: periodEnd,
        ingestion_quota:    quotas.ingestion,
        seo_quota:          quotas.seo,
        variant_quota:      quotas.variants,
        match_quota:        quotas.match,
      })
      .eq("tenant_id", userId);

    console.info(`[update-plan] userId=${userId} → plan=${plan}/${billing} sub=${activeSub.id}`);

    return NextResponse.json({
      ok:      true,
      plan,
      billing,
      status:  updatedSub.status,
      periodEnd,
    });
  } catch (err: any) {
    console.error("update-plan error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to update plan" },
      { status: 500 }
    );
  }
}
