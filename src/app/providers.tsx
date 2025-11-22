'use client';

import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  // if you add ThemeProvider, QueryClientProvider, etc, they go here
  return <>{children}</>;
}
