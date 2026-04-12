import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServiceSupabaseClient } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// ─── Plan quota map ───────────────────────────────────────────────────────────
// Maps the Stripe plan name (derived from price metadata or price ID env lookup)
// to the quota values stored in tenant_subscriptions.
const PLAN_QUOTAS: Record<string, { ingestion: number | null; seo: number | null; variants: number | null; match: number | null }> = {
  starter: { ingestion: 500,  seo: 500,  variants: 250,  match: 100  },
  growth:  { ingestion: 5000, seo: 5000, variants: 2500, match: 1000 },
  pro:     { ingestion: null, seo: null,  variants: null,  match: null }, // unlimited
};

/** Derive plan name from a Stripe price ID by checking env vars. */
function planFromPriceId(priceId: string): string {
  const plans = ["starter", "growth", "pro"];
  for (const plan of plans) {
    const monthly = process.env[`STRIPE_PRICE_ID_${plan.toUpperCase()}_MONTHLY`];
    const yearly  = process.env[`STRIPE_PRICE_ID_${plan.toUpperCase()}_YEARLY`];
    const legacy  = process.env[`STRIPE_PRICE_ID_${plan.toUpperCase()}`];
    if (priceId === monthly || priceId === yearly || priceId === legacy) {
      return plan;
    }
  }
  return "starter"; // fallback
}

/** Persist or update a subscription record in Supabase. */
async function upsertSubscription(opts: {
  tenantId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  planName: string;
  status: string;
  currentPeriodEnd: Date | null;
}) {
  const supabase = getServiceSupabaseClient();
  const quotas = PLAN_QUOTAS[opts.planName] ?? PLAN_QUOTAS.starter;

  const { error } = await supabase
    .from("tenant_subscriptions")
    .upsert(
      {
        tenant_id:          opts.tenantId,
        plan_name:          opts.planName,
        status:             opts.status,
        current_period_end: opts.currentPeriodEnd?.toISOString() ?? null,
        ingestion_quota:    quotas.ingestion,
        seo_quota:          quotas.seo,
        variant_quota:      quotas.variants,
        match_quota:        quotas.match,
      },
      { onConflict: "tenant_id" }
    );

  if (error) {
    console.error("upsertSubscription error:", error.message);
    throw error;
  }
}

/** Ensure a team_members row exists so billing.ts can resolve tenancy. */
async function ensureTeamMember(tenantId: string, userId: string) {
  const supabase = getServiceSupabaseClient();

  // Check if row already exists
  const { data } = await supabase
    .from("team_members")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .limit(1);

  if (data && data.length > 0) return; // already exists

  const { error } = await supabase
    .from("team_members")
    .insert({ tenant_id: tenantId, user_id: userId, role: "owner" });

  if (error && !error.message.includes("duplicate")) {
    console.error("ensureTeamMember error:", error.message);
  }
}

/** Send a simple renewal failure notification (email via Supabase or log). */
async function notifyRenewalFailed(opts: {
  tenantId: string;
  planName: string;
  customerId: string;
  invoiceId: string;
}) {
  // Log for now; replace with your email provider (Resend, Postmark, etc.)
  console.warn("[RENEWAL FAILED]", {
    tenantId:   opts.tenantId,
    plan:       opts.planName,
    customerId: opts.customerId,
    invoiceId:  opts.invoiceId,
    action:     "Send renewal-failure email to owner",
  });

  // Optionally store an alert in Supabase for in-app notification
  try {
    const supabase = getServiceSupabaseClient();
    await supabase.from("tenant_subscriptions").update({ status: "past_due" }).eq("tenant_id", opts.tenantId);
  } catch (err) {
    console.error("Failed to mark subscription past_due:", err);
  }
}

// ─── Webhook route ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const raw = await req.arrayBuffer();
    const sig = req.headers.get("stripe-signature") || "";
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(Buffer.from(raw), sig, endpointSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    switch (event.type) {

      // ── User completes Stripe checkout ──────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId      = session.customer as string;
        const subscriptionId  = session.subscription as string | null;
        const clerkUserId     = session.metadata?.clerkUserId;
        const planName        = session.metadata?.plan ?? "starter";

        if (!clerkUserId) {
          console.error("checkout.session.completed: missing clerkUserId in metadata");
          break;
        }

        // tenantId = clerkUserId (one user = one tenant for self-serve)
        const tenantId = clerkUserId;

        // Ensure team membership so billing.ts can resolve tenancy
        await ensureTeamMember(tenantId, clerkUserId);

        // Fetch full subscription from Stripe to get period end + status
        let subStatus = "active";
        let periodEnd: Date | null = null;
        if (subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            subStatus = sub.status;
            periodEnd = new Date(sub.current_period_end * 1000);
          } catch (err) {
            console.warn("Could not retrieve subscription from Stripe:", err);
          }
        }

        await upsertSubscription({
          tenantId,
          stripeSubscriptionId: subscriptionId ?? "",
          stripeCustomerId:     customerId,
          planName,
          status:    subStatus,
          currentPeriodEnd: periodEnd,
        });

        console.info(`[webhook] checkout.session.completed: tenant=${tenantId} plan=${planName} status=${subStatus}`);
        break;
      }

      // ── Subscription created or updated (covers renewals + plan changes) ───
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Derive plan from the first price item
        const priceId  = sub.items.data[0]?.price?.id ?? "";
        const planName = sub.metadata?.plan ?? planFromPriceId(priceId);

        // Look up clerkUserId via Stripe customer metadata
        let clerkUserId: string | undefined;
        try {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          clerkUserId = customer.metadata?.clerkUserId;
        } catch (err) {
          console.warn("Could not retrieve Stripe customer:", err);
        }

        if (!clerkUserId) {
          console.warn(`${event.type}: no clerkUserId on customer ${customerId}`);
          break;
        }

        const tenantId  = clerkUserId;
        const periodEnd = new Date(sub.current_period_end * 1000);

        await ensureTeamMember(tenantId, clerkUserId);
        await upsertSubscription({
          tenantId,
          stripeSubscriptionId: sub.id,
          stripeCustomerId:     customerId,
          planName,
          status:    sub.status,
          currentPeriodEnd: periodEnd,
        });

        console.info(`[webhook] ${event.type}: tenant=${tenantId} plan=${planName} status=${sub.status}`);
        break;
      }

      // ── Successful renewal payment ──────────────────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason !== "subscription_cycle") break; // skip first payment

        const customerId = invoice.customer as string;
        let clerkUserId: string | undefined;
        try {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          clerkUserId = customer.metadata?.clerkUserId;
        } catch (_) {}

        if (!clerkUserId) break;

        // Reset usage counters on successful renewal
        const supabase = getServiceSupabaseClient();
        const nowIso   = new Date().toISOString();
        await supabase
          .from("usage_counters")
          .update({
            ingestion_count: 0,
            seo_count:       0,
            variants_count:  0,
            match_count:     0,
            period_start:    nowIso,
            updated_at:      nowIso,
          })
          .eq("tenant_id", clerkUserId);

        // Also ensure subscription is marked active
        await supabase
          .from("tenant_subscriptions")
          .update({ status: "active" })
          .eq("tenant_id", clerkUserId);

        console.info(`[webhook] invoice.payment_succeeded: usage reset for tenant=${clerkUserId}`);
        break;
      }

      // ── Renewal payment failed ──────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice    = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        let clerkUserId: string | undefined;
        let planName = "unknown";
        try {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          clerkUserId = customer.metadata?.clerkUserId;
        } catch (_) {}

        if (!clerkUserId) break;

        // Fetch current plan from DB for the alert message
        const supabase = getServiceSupabaseClient();
        const { data } = await supabase
          .from("tenant_subscriptions")
          .select("plan_name")
          .eq("tenant_id", clerkUserId)
          .limit(1);
        planName = data?.[0]?.plan_name ?? "unknown";

        await notifyRenewalFailed({
          tenantId:   clerkUserId,
          planName,
          customerId,
          invoiceId:  invoice.id,
        });

        console.warn(`[webhook] invoice.payment_failed: tenant=${clerkUserId} plan=${planName}`);
        break;
      }

      // ── Subscription cancelled / deleted ────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub        = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        let clerkUserId: string | undefined;
        try {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          clerkUserId = customer.metadata?.clerkUserId;
        } catch (_) {}

        if (!clerkUserId) break;

        const supabase = getServiceSupabaseClient();
        await supabase
          .from("tenant_subscriptions")
          .update({ status: "canceled" })
          .eq("tenant_id", clerkUserId);

        console.info(`[webhook] customer.subscription.deleted: tenant=${clerkUserId} marked canceled`);
        break;
      }

      default:
        // Unhandled events — do nothing
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Unhandled webhook error:", err);
    return new Response("Internal error", { status: 500 });
  }
}
