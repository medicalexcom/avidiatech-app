import './globals.css';
import type { ReactNode } from 'react';
import Providers from './providers';

export const metadata = {
  title: 'Aviatech App',
  description: 'Product Data Automation SaaS Platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const clerkPublishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY;

  return (
    <html lang="en">
      <body>
        <Providers publishableKey={clerkPublishableKey}>{children}</Providers>
      </body>
    </html>
  );
}
