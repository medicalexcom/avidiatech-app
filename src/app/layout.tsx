// src/app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import Providers from "./providers";
import Header from "../components/Header"; // adjust path if needed

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
    <html lang="en" suppressHydrationWarning>
      {/* Light by default; dark mode comes from `html.dark` via next-themes */}
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">
        <Providers>
          {/* Header is a client component that contains TopNav + Sidebar + mobile handling */}
          <Header>
            <main className="container py-6">{children}</main>
          </Header>
        </Providers>
      </body>
    </html>
  );
}
