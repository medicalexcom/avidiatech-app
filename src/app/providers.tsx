// src/app/providers.tsx
'use client';

import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'Clerk publishable key is not set. Rendering without Clerk—add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable auth.'
      );
    }
    return <>{children}</>;
  }

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
