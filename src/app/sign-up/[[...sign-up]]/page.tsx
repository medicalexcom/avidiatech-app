'use client';

import { ClerkLoaded, ClerkLoading, SignUp } from '@clerk/nextjs';
import ClerkDiagnosticsPanel from '@/components/clerk/ClerkDiagnosticsPanel';
import ClerkSetupAlert from '@/components/clerk/ClerkSetupAlert';

export default function SignUpPage() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const frontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;
  const missingKeys = [
    !publishableKey ? 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY' : undefined,
  ].filter(Boolean) as string[];
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in';

  if (missingKeys.length) {
    return (
      <div className="flex flex-col items-center gap-8 pt-16">
        <ClerkSetupAlert
          missingKeys={missingKeys}
          headline="Clerk credentials are missing, so the sign-up form cannot load."
        />
        <ClerkDiagnosticsPanel />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 pt-16">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <ClerkLoading>
          <p className="text-center text-sm text-slate-500">Loading Clerk…</p>
        </ClerkLoading>
        <ClerkLoaded>
          <SignUp routing="path" path="/sign-up" signInUrl={signInUrl} />
        </ClerkLoaded>
      </div>
      {!frontendApi && (
        <div className="w-full max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold text-amber-900">NEXT_PUBLIC_CLERK_FRONTEND_API is not set.</p>
          <p className="mt-2">
            Clerk will infer the default frontend API from your publishable key. Add this variable if you
            are using a custom Clerk domain or need to mirror the value set in the dashboard.
          </p>
        </div>
      )}
      <ClerkDiagnosticsPanel />
    </div>
  );
}
