import './globals.css';
import type { ReactNode } from 'react';
import Providers from './providers';

export const metadata = {
  title: 'AvidiaTech | Product Data Automation',
  description:
    'AvidiaTech unifies product data ingestion, enrichment, and monitoring with secure, Clerk-powered access and Stripe-ready billing.',
  openGraph: {
    title: 'AvidiaTech | Product Data Automation',
    description:
      'Ship faster with centralized workflows for product data extraction, translations, SEO formatting, and analytics—secured with Clerk.',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
