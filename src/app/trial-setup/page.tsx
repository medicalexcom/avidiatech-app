"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export default function TrialSetupPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [status, setStatus] = useState<'initializing' | 'creating-tenant' | 'starting-trial' | 'error' | 'success'>('initializing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      // Redirect to sign-up if not authenticated
      router.push('/sign-up');
      return;
    }

    async function setupTrial() {
      try {
        setStatus('creating-tenant');
        
        // Call API to create tenant
        const tenantResponse = await fetch('/api/setup-tenant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!tenantResponse.ok) {
          const errorData = await tenantResponse.json();
          throw new Error(errorData.error || 'Failed to create tenant');
        }

        const tenantData = await tenantResponse.json();
        
        setStatus('starting-trial');
        
        // Call API to create Stripe checkout session
        const checkoutResponse = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenantId: tenantData.tenantId,
          }),
        });

        if (!checkoutResponse.ok) {
          const errorData = await checkoutResponse.json();
          throw new Error(errorData.error || 'Failed to create checkout session');
        }

        const checkoutData = await checkoutResponse.json();
        
        // Redirect to Stripe checkout
        if (checkoutData.url) {
          window.location.href = checkoutData.url;
        } else {
          // If no checkout URL (e.g., free trial doesn't require payment), redirect to dashboard
          setStatus('success');
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
        }
      } catch (err) {
        console.error('Trial setup error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    }

    setupTrial();
  }, [user, isLoaded, router]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          {status === 'error' ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900">Setup Failed</h2>
              <p className="mb-4 text-gray-600">{error}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="rounded-lg bg-blue-500 px-6 py-2 text-white hover:bg-blue-600"
              >
                Go to Dashboard
              </button>
            </>
          ) : status === 'success' ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900">All Set!</h2>
              <p className="text-gray-600">Redirecting to your dashboard...</p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-gray-900">
                {status === 'creating-tenant' && 'Creating your workspace...'}
                {status === 'starting-trial' && 'Setting up your trial...'}
                {status === 'initializing' && 'Initializing...'}
              </h2>
              <p className="text-gray-600">Please wait while we set up your account.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
