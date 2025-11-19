'use client';

import { ClerkLoaded, ClerkLoading, SignIn } from '@clerk/nextjs';
import ClerkDiagnosticsPanel from '@/components/clerk/ClerkDiagnosticsPanel';
import ClerkSetupAlert from '@/components/clerk/ClerkSetupAlert';

export default function SignInPage() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const frontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;
  const missingKeys = [
    !publishableKey ? 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY' : undefined,
    !frontendApi ? 'NEXT_PUBLIC_CLERK_FRONTEND_API' : undefined,
  ].filter(Boolean) as string[];
  const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up';

  if (missingKeys.length) {
    return (
      <div className="flex flex-col items-center gap-8 pt-16">
        <ClerkSetupAlert
          missingKeys={missingKeys}
          headline="Clerk credentials are missing, so the sign-in form cannot load."
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
          <SignIn routing="path" path="/sign-in" signUpUrl={signUpUrl} />
        </ClerkLoaded>
      </div>
      <ClerkDiagnosticsPanel />
    </div>
  );
}
