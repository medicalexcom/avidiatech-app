import './globals.css';
import { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata = {
  title: 'AvidiaTech | Product Data Automation',
  description: 'AvidiaTech unifies product data ingestion, enrichment, and monitoring with secure, Clerk-powered access and Stripe-ready billing.',
  openGraph: {
    title: 'AvidiaTech | Product Data Automation',
    description: 'AvidiaTech unifies product data ingestion, enrichment, and monitoring with secure, Clerk-powered access and Stripe-ready billing.',
  }
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
