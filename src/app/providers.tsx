'use client';

import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClerkProvider dynamic>
        {children}
      </ClerkProvider>
    </Suspense>
  );
}
