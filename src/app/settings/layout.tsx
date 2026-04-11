import React from "react";
import Link from "next/link";

/**
 * Settings layout — wraps all /settings/* pages with a consistent nav shell.
 * No sidebar; full-width with a centered content column.
 */

const navLinks = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/organization", label: "Organization" },
  { href: "/settings/developer/api-keys", label: "API Keys" },
  { href: "/settings/developer/webhooks", label: "Webhooks" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Settings top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 py-4 text-[12px] font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Dashboard
          </Link>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          <nav className="flex items-center gap-1 overflow-x-auto py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
