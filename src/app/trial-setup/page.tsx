import { redirect } from 'next/navigation';
import { auth, clerkClient } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { getServiceSupabaseClient } from '@/lib/supabase';

async function createTenantAndStripeSession() {
  const { userId, sessionClaims } = auth();

  // 1. Verify the user is authenticated
  if (!userId) {
    return redirect('/sign-in');
  }

  const supabase = getServiceSupabaseClient();

  // Check if a team_member entry already exists to prevent duplicates
  const { data: existingMember, error: existingMemberError } = await supabase
    .from('team_members')
    .select('tenant_id')
    .eq('user_id', userId)
    .single();

  if (existingMemberError && existingMemberError.code !== 'PGRST116') {
    // An actual error occurred, not just "no rows found"
    throw existingMemberError;
  }

  if (existingMember) {
    // User already has a tenant, send them to the dashboard
    return redirect('/dashboard');
  }

  // 2. Create a Tenant in Supabase
  const { data: tenantData, error: tenantErr } = await supabase
    .from('tenants')
    .insert({}) // Add any default tenant data if needed
    .select('id')
    .single();

  if (tenantErr) throw tenantErr;
  const tenantId = tenantData.id;

  // 3. Link the new user to the tenant as 'owner'
  const { error: memberErr } = await supabase.from('team_members').insert({
    tenant_id: tenantId,
    user_id: userId,
    role: 'owner',
  });

  if (memberErr) throw memberErr;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-04-10',
  });

  // 4. Create a Stripe Customer
  const user = await clerkClient.users.getUser(userId);
  const customer = await stripe.customers.create({
    email: user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress,
    metadata: { clerkUserId: userId, tenantId },
  });

  // 5. Create a Stripe Checkout Session for the Trial Plan
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customer.id,
    line_items: [{ price: process.env.STRIPE_TRIAL_PRICE_ID!, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { tenantId },
    },
    success_url: `${appUrl}/dashboard?trial=success`,
    cancel_url: `${appUrl}/?trial=canceled`,
  });

  // 6. Redirect to Stripe Checkout
  if (session.url) {
    return redirect(session.url);
  } else {
    // Handle error case where session URL isn't created
    return redirect('/?error=stripe_session_failed');
  }
}

export default async function TrialSetupPage() {
    await createTenantAndStripeSession();
    // This component will either redirect or throw an error, so it won't render anything.
    // You could add a loading spinner as a fallback.
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Setting up your trial...</p>
        </div>
    );
}
