import React from "react";
import Link from "next/link";

/**
 * Settings layout — wraps all /settings/* pages with a consistent premium nav shell.
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
    <div className="dark relative min-h-screen bg-slate-950 text-slate-50 overflow-x-hidden">

      {/* Ambient glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-500/8 blur-[120px]" />
        <div className="absolute top-1/3 right-[-8%] h-[400px] w-[400px] rounded-full bg-violet-500/8 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-[300px] w-[400px] rounded-full bg-cyan-500/6 blur-[100px]" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle,rgba(148,163,184,0.5) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* Settings top bar */}
      <header className="relative sticky top-0 z-30 border-b border-slate-800/70 bg-slate-950/90 backdrop-blur-md">
        {/* Identity stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: "linear-gradient(90deg,#6366f1 0%,#8b5cf6 50%,#06b6d4 100%)" }}
        />

        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 sm:px-6">
          {/* Back link */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 py-4 text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Dashboard
          </Link>

          <div className="h-4 w-px bg-slate-800" />

          {/* Settings label */}
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Settings
          </span>

          <div className="h-4 w-px bg-slate-800" />

          {/* Nav links */}
          <nav className="flex items-center gap-0.5 overflow-x-auto py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-slate-400 transition-all hover:bg-slate-800/70 hover:text-slate-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
