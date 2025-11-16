// src/app/layout.tsx
'use client';

import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Aviatech App',
  description: 'Product Data Automation SaaS Platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
