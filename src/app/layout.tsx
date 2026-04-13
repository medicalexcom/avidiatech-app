import "./globals.css";
// Plus Jakarta Sans — modern geometric sans used by premium B2B SaaS products.
// Bundled locally via @fontsource-variable so the build never hits Google servers.
import "@fontsource-variable/plus-jakarta-sans";
import type { ReactNode } from "react";
import Providers from "./providers";
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
    images: [{ url: "/logo.svg" }],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Light by default; dark mode comes from `html.dark` via next-themes */}
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased flex flex-col font-jakarta">
        <ErrorBoundary>
          <Providers>
            <ToastProvider>{children}</ToastProvider>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
