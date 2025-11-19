'use client';

import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';

interface ProvidersProps {
  children: ReactNode;
  publishableKey?: string;
}

export default function Providers({ children, publishableKey }: ProvidersProps) {
  const resolvedKey = publishableKey ?? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!resolvedKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'Clerk publishable key is missing. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY or CLERK_PUBLISHABLE_KEY to enable authentication UI.',
      );
    }
    return <>{children}</>;
  }

  return <ClerkProvider publishableKey={resolvedKey}>{children}</ClerkProvider>;
}
