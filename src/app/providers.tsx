'use client';

import { Suspense } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div />}>
      <ClerkProvider>{children}</ClerkProvider>
    </Suspense>
  );
}
