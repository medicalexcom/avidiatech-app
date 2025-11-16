// src/app/layout.tsx
// Root layout for Next.js App Router

import './globals.css';
import type { ReactNode } from 'react';
// import Providers from './providers';  // adjust the path if necessary

export const metadata = {
  title: 'Aviatech App',
  description: 'Product Data Automation SaaS Platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
