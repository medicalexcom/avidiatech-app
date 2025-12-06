import { NextResponse } from "next/server";
import Stripe from "stripe";
import { buffer } from "node:stream/consumers"; // or use req.arrayBuffer in web runtime

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

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

    // Handle events
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // session.subscription contains the subscription id (sometimes null until asynchronous)
        const subscriptionId = (session.subscription as string) ?? null;
        const customerId = session.customer as string;
        const clerkUserId = session.metadata?.clerkUserId as string | undefined;
        // Persist a mapping in your DB: (clerkUserId -> stripeCustomerId, subscriptionId)
        // Example: await saveSubscription({ clerkUserId, stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, status: 'active' });
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "invoice.payment_succeeded": {
        const subscription = event.data.object as Stripe.Subscription | Stripe.Invoice;
        // Use subscription.customer, subscription.id, subscription.status to update DB
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Unhandled webhook error:", err);
    return new Response("Internal error", { status: 500 });
  }
}
