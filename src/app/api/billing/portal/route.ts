import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2022-11-15" });
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(req: Request) {
  try {
    const { userId, user } = getAuth();
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    // Try to find a Stripe customer by email first
    const email = user?.emailAddresses?.[0]?.emailAddress || undefined;
    let customer;
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      customer = customers.data[0];
    }

    if (!customer) {
      // If no customer exists yet, instruct frontend to create checkout first
      return NextResponse.json({ error: "no_stripe_customer" }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${APP_URL}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("create-billing-portal error:", err);
    return NextResponse.json({ error: err.message || "stripe error" }, { status: 500 });
  }
}
