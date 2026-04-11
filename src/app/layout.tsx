import "./globals.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import Providers from "./providers";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

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
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      {/* Light by default; dark mode comes from `html.dark` via next-themes */}
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased flex flex-col font-sans">
        <ErrorBoundary>
          <Providers>
            <ToastProvider>{children}</ToastProvider>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
