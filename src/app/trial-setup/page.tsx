import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getServiceSupabaseClient } from '@/lib/supabase';
import { extractEmailFromSessionClaims } from '@/lib/clerk-utils';

export default async function TrialSetupPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const userEmail = extractEmailFromSessionClaims(sessionClaims);

  if (!userEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-4">Unable to retrieve user email. Please contact support.</p>
        </div>
      </div>
    );
  }

  // Check if user already has a tenant
  const supabase = getServiceSupabaseClient();
  const { data: existingMembership, error: membershipCheckError } = await supabase
    .from('team_members')
    .select('tenant_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingMembership) {
    // User already has a tenant, redirect to dashboard
    redirect('/dashboard');
  }

  // Create a new tenant for the user
  // Sanitize email to create a safe tenant name
  const emailUsername = userEmail.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '');
  const tenantName = emailUsername ? `${emailUsername}'s Workspace` : 'My Workspace';
  const { data: newTenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: tenantName,
      owner_email: userEmail,
    })
    .select('id')
    .single();

  if (tenantError || !newTenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-4">Failed to create tenant: {tenantError?.message}</p>
        </div>
      </div>
    );
  }

  // Add user as owner of the tenant
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      tenant_id: newTenant.id,
      user_id: userId,
      user_email: userEmail,
      role: 'owner',
    });

  if (memberError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-4">Failed to add team member: {memberError.message}</p>
        </div>
      </div>
    );
  }

  // Create Stripe checkout session
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const checkoutUrl = `${appUrl}/api/create-checkout-session?tenant_id=${newTenant.id}`;

  // Redirect to the API route that will create the checkout session
  redirect(checkoutUrl);
}
