/* Root layout for Next.js App Router */
import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "AvidiaTech Dashboard",
  description: "Product Data Automation SaaS Platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">
        {/* Simple header with navigation */}
        <header className="border-b p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-2xl font-bold">AvidiaTech</h1>
          <nav className="flex gap-4">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/ingest" className="hover:underline">
              Ingest
            </Link>
            <Link href="/render" className="hover:underline">
              Render
            </Link>
          </nav>
        </header>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
