// src/app/providers.tsx
'use client';

import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const frontendApi = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API;
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in';
  const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up';

  const hasPublishableKey = Boolean(publishableKey);
  const hasFrontendApi = Boolean(frontendApi);

  if (!hasPublishableKey && !hasFrontendApi) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'Clerk keys missing. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY or NEXT_PUBLIC_CLERK_FRONTEND_API to enable authentication.'
      );
    }
    return <>{children}</>;
  }

  if (!hasPublishableKey && hasFrontendApi && process.env.NODE_ENV !== 'production') {
    console.warn(
      'NEXT_PUBLIC_CLERK_FRONTEND_API is set but NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing. Clerk will not load without the publishable key.'
    );
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
    >
      {children}
    </ClerkProvider>
  );
}
