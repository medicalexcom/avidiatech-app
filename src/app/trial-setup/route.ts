import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

/**
 * Server route: /trial-setup
 *
 * Behavior:
 * - verifies Clerk auth session
 * - creates a tenant (supabase, service role)
 * - creates a team_members entry for the user with role "owner"
 * - creates a Stripe customer and a checkout session with a 14-day trial
 * - redirects the user to the Stripe checkout session URL
 *
 * Environment variables required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - STRIPE_SECRET_KEY
 * - STRIPE_PRICE_ID
 * - NEXT_PUBLIC_APP_URL (used for success/cancel URLs)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || process.env.NEXTAUTH_URL;

export async function GET() {
  try {
    const { userId } = auth();

    if (!userId) {
      // Not signed in — send them to sign-in and bring them back to /trial-setup afterwards
      return NextResponse.redirect(new URL("/sign-in?redirect_url=/trial-setup", APP_URL || "http://localhost:3000"));
    }

    // Fetch user information (email) from Clerk
    const user = await clerkClient.users.getUser(userId);
    const email =
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      (user.email ? user.email : null);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Missing Supabase environment variables" }, { status: 500 });
    }
    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
      return NextResponse.json({ error: "Missing Stripe environment variables" }, { status: 500 });
    }
    if (!APP_URL) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_APP_URL (app base URL)" }, { status: 500 });
    }

    // Create Supabase client with service role key (server-side only)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 1) Create tenant
    const tenantName = `${user.firstName ?? "User"}${user.lastName ? ` ${user.lastName}` : ""}`.trim() || "Tenant";
    const { data: tenantData, error: tenantError } = await supabase
      .from("tenants")
      .insert([{ name: tenantName }])
      .select()
      .single();

    if (tenantError || !tenantData) {
      console.error("Failed to create tenant:", tenantError);
      return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
    }

    const tenantId = tenantData.id;

    // 2) Add user as owner in team_members
    const { error: memberError } = await supabase.from("team_members").insert([
      {
        tenant_id: tenantId,
        user_id: userId,
        role: "owner",
      },
    ]);

    if (memberError) {
      console.error("Failed to add team member:", memberError);
      // Not fatal for redirecting to Stripe, but surface error to logs and return failure.
      return NextResponse.json({ error: "Failed to add team member" }, { status: 500 });
    }

    // 3) Create Stripe customer
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });
    const customer = await stripe.customers.create({
      email: email ?? undefined,
      metadata: {
        clerkUserId: userId,
        tenantId: tenantId,
      },
    });

    // 4) Create Stripe Checkout session: subscription with 14-day trial
    const successUrl = new URL("/dashboard", APP_URL).toString();
    const cancelUrl = new URL("/", APP_URL).toString();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          tenantId,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      console.error("Stripe session missing url", session);
      return NextResponse.json({ error: "Failed to create Stripe session" }, { status: 500 });
    }

    // Redirect to Stripe checkout session
    return NextResponse.redirect(session.url);
  } catch (err) {
    console.error("Error in /trial-setup:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
