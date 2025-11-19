'use client';

import { ClerkLoaded, ClerkLoading, SignIn } from '@clerk/nextjs';
import ClerkDiagnosticsPanel from '@/components/clerk/ClerkDiagnosticsPanel';
import ClerkSetupAlert from '@/components/clerk/ClerkSetupAlert';
import type { ClerkEnv } from '@/lib/clerk-env';

type Props = {
  env: ClerkEnv;
};

export default function SignInClient({ env }: Props) {
  const missingKeys = [
    !env.publishableKey ? 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (or CLERK_PUBLISHABLE_KEY)' : undefined,
  ].filter(Boolean) as string[];

  if (missingKeys.length) {
    return (
      <div className="flex flex-col items-center gap-8 pt-16">
        <ClerkSetupAlert
          missingKeys={missingKeys}
          headline="Clerk credentials are missing, so the sign-in form cannot load."
        />
        <ClerkDiagnosticsPanel
          publishableKey={env.publishableKey}
          frontendApi={env.frontendApi}
          signInUrl={env.signInUrl}
          signUpUrl={env.signUpUrl}
        />
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
          <SignIn routing="path" path="/sign-in" signUpUrl={env.signUpUrl} />
        </ClerkLoaded>
      </div>
      {!env.frontendApi && (
        <div className="w-full max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold text-amber-900">NEXT_PUBLIC_CLERK_FRONTEND_API is not set.</p>
          <p className="mt-2">
            Clerk will infer the default frontend API from your publishable key. Add this variable if you are using a custom Clerk
            domain or need to mirror the value set in the dashboard.
          </p>
        </div>
      )}
      <ClerkDiagnosticsPanel
        publishableKey={env.publishableKey}
        frontendApi={env.frontendApi}
        signInUrl={env.signInUrl}
        signUpUrl={env.signUpUrl}
      />
    </div>
  );
}
