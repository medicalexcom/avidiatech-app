// src/app/providers.tsx
'use client';

import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. Rendering without Clerk—add a real key to enable authentication.'
      );
    }
    return <>{children}</>;
  }

  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
}
