import "./globals.css";
import type { ReactNode } from "react";
import Providers from "./providers";
import { ClerkProvider } from "@clerk/nextjs";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ui/toast";

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
        {/* Keep body in normal document flow (NOT flex) to avoid phantom bottom gaps from nested layouts. */}
        <body className="bg-slate-50 text-slate-950 antialiased">
          <ErrorBoundary>
            <Providers>
              <ToastProvider>{children}</ToastProvider>
            </Providers>
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
