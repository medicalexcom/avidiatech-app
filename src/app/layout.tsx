import "./globals.css";
import type { ReactNode } from "react";
import Providers from "./providers";
import { ClerkProvider } from "@clerk/nextjs";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata = {
  title: "AvidiaTech | Product Data Automation",
  description:
    "AvidiaTech unifies product data ingestion, enrichment, and monitoring with secure, Clerk-powered access and Stripe-ready billing.",
  openGraph: {
    title: "AvidiaTech | Product Data Automation",
    description:
      "Ship faster with centralized workflows for product data extraction, translations, SEO formatting, and analytics—secured with Clerk.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en" suppressHydrationWarning>
        {/* Light by default; dark mode comes from `html.dark` via next-themes */}
        <body className="min-h-screen bg-slate-50 text-slate-950 antialiased flex flex-col">
          <ErrorBoundary>
            <Providers>{children}</Providers>
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
