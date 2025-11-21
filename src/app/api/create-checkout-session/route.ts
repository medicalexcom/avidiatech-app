import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripeClient } from '@/lib/stripe';
import { getServiceSupabaseClient } from '@/lib/supabase';
import { extractEmailFromSessionClaims } from '@/lib/clerk-utils';
import { TRIAL_PERIOD_DAYS, STRIPE_PRICING } from '@/lib/config';

export async function POST(request: Request) {
  try {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const userEmail = extractEmailFromSessionClaims(sessionClaims);
    if (!userEmail) {
      return NextResponse.json({ error: 'Email not found in session' }, { status: 400 });
    }

    // Verify user has access to this tenant
    const supabase = getServiceSupabaseClient();
    
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from('team_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied to this tenant' }, { status: 403 });
    }

    // Get or create Stripe customer
    const stripe = getStripeClient();
    
    // Check if customer already exists for this tenant
    const { data: subscription } = await supabase
      .from('tenant_subscriptions')
      .select('stripe_customer_id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          tenant_id: tenantId,
        },
      });
      customerId = customer.id;

      // Update subscription record with customer ID
      await supabase
        .from('tenant_subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('tenant_id', tenantId);
    }

    // For a free trial, we can either:
    // 1. Create a checkout session with a trial period
    // 2. Just redirect to dashboard since trial is already set up
    
    // For now, let's create a checkout session for future subscription setup
    // This allows users to add payment info during the trial
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                    'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: STRIPE_PRICING.PRO_PLAN.currency,
            product_data: {
              name: STRIPE_PRICING.PRO_PLAN.name,
              description: STRIPE_PRICING.PRO_PLAN.description,
            },
            unit_amount: STRIPE_PRICING.PRO_PLAN.amount,
            recurring: {
              interval: STRIPE_PRICING.PRO_PLAN.interval,
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_DAYS,
        metadata: {
          tenant_id: tenantId,
        },
      },
      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard`,
      metadata: {
        tenant_id: tenantId,
      },
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    
    if (error instanceof Error && error.message.includes('Stripe secret key')) {
      // If Stripe is not configured, just return success and let user go to dashboard
      return NextResponse.json({
        url: null,
        message: 'Stripe not configured, proceeding to dashboard',
      });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
