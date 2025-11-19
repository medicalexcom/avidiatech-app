// src/app/providers.tsx
'use client';

import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';

type ProvidersProps = {
  children: ReactNode;
  publishableKey?: string;
};

export default function Providers({ children, publishableKey }: ProvidersProps) {
  const resolvedPublishableKey = publishableKey || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!resolvedPublishableKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'Clerk publishable key is not set. Rendering without Clerk—add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable auth.'
      );
    }
    return <>{children}</>;
  }

  return <ClerkProvider publishableKey={resolvedPublishableKey}>{children}</ClerkProvider>;
}
