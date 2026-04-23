import { NextResponse } from "next/server";
import { safeGetAuth, isAuthUnavailableError } from "@/lib/clerkSafe";
import { isOwnerUser } from "@/lib/auth/isOwnerUser";
import { clerkClient } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * GET /api/subscription/status
 *
 * Returns the current subscription state for the authenticated user.
 * Always checks Supabase first (source of truth for plan/status).
 * Falls back to Stripe lookup if no DB row found.
 *
 * Response shape:
 * {
 *   active: boolean,
 *   status: string,          // "active" | "trialing" | "past_due" | "canceled" | "none"
 *   planName: string | null, // "starter" | "growth" | "pro" | null
 *   isOwner: boolean,
 *   reason?: string,
 * }
 */
export async function GET(req: Request) {
  try {
    const { userId } = (safeGetAuth(req as any, { strict: process.env.NODE_ENV === "production" }) as { userId?: string | null }) || {};
    if (!userId) {
      return NextResponse.json({ active: false, status: "none", planName: null, isOwner: false, reason: "unauthenticated" });
    }

    // ── 1. Owner bypass ───────────────────────────────────────────────────────
    let isOwner = false;
    try {
      isOwner = await isOwnerUser(userId);
    } catch {
      // If owner detection fails, continue as normal user
    }

    // ── 2. Supabase subscription lookup (source of truth) ────────────────────
    let dbPlanName: string | null = null;
    let dbStatus: string | null = null;
    try {
      const supabase = getServiceSupabaseClient();

      // tenant_id = userId for self-serve accounts (1 user = 1 tenant)
      const { data } = await supabase
        .from("tenant_subscriptions")
        .select("plan_name, status")
        .eq("tenant_id", userId)
        .limit(1)
        .maybeSingle();

      if (data) {
        dbPlanName = data.plan_name ?? null;
        dbStatus   = data.status ?? null;
      }
    } catch (err) {
      console.warn("[subscription/status] Supabase lookup failed:", err);
    }

    // If we have a DB row, use it as the authoritative answer
    if (dbStatus) {
      const active = dbStatus === "active" || dbStatus === "trialing";
      return NextResponse.json({
        active,
        status:   dbStatus,
        planName: dbPlanName,
        isOwner,
      });
    }

    // ── 3. Owner with no DB row → treat as active ─────────────────────────────
    if (isOwner) {
      return NextResponse.json({
        active:   true,
        status:   "active",
        planName: null,
        isOwner:  true,
        reason:   "owner_no_db_row",
      });
    }

    // ── 4. Fallback: Stripe lookup for users with no DB record yet ────────────
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ active: false, status: "none", planName: null, isOwner: false, reason: "no_stripe" });
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    let clerkUser: any;
    try {
      const client = await clerkClient();
      clerkUser = await client.users.getUser(userId);
    } catch {
      clerkUser = undefined;
    }

    const stripeCustomerId =
      (clerkUser?.privateMetadata as any)?.stripeCustomerId ||
      (clerkUser?.publicMetadata as any)?.stripeCustomerId;

    let customerId = stripeCustomerId;
    if (!customerId) {
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
      if (email) {
        try {
          const customers = await stripe.customers.list({ email, limit: 1 });
          if (customers.data.length > 0) customerId = customers.data[0].id;
        } catch { /* noop */ }
      }
    }

    if (!customerId) {
      return NextResponse.json({ active: false, status: "none", planName: null, isOwner: false, reason: "no_customer" });
    }

    try {
      const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10 });
      for (const s of subs.data) {
        if (s.status === "active" || s.status === "trialing") {
          return NextResponse.json({ active: true, status: s.status, planName: null, isOwner: false });
        }
      }
    } catch { /* noop */ }

    return NextResponse.json({ active: false, status: "none", planName: null, isOwner: false, reason: "no_active_subscription" });

  } catch (err: any) {
    if (isAuthUnavailableError(err)) {
      return NextResponse.json({ error: "auth_unavailable" }, { status: 500 });
    }
    console.error("[subscription/status] error:", err);
    return NextResponse.json({ active: false, status: "none", planName: null, isOwner: false, reason: "internal_error" }, { status: 500 });
  }
}
