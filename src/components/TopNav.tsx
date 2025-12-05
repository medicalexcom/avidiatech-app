"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import ProfileMenu from "./ProfileMenu";

const primaryLinks = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Analytics", href: "/dashboard/analytics" },
  { name: "Visualize", href: "/dashboard/visualize" },
];

const secondaryLinks = [
  { name: "Roles", href: "/dashboard/roles" },
  { name: "Versioning", href: "/dashboard/versioning" },
];

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useUser();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      // Treat /dashboard and any nested route without a more specific match as dashboard
      return pathname === "/dashboard";
    }
    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: brand + workspace */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              AvidiaTech
            </span>
            <span className="text-sm font-semibold text-slate-50">
              Product Data OS
            </span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-slate-700 px-2.5 py-1 text-[10px] text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live dashboard
          </span>
        </div>

        {/* Center: primary navigation */}
        <nav
          aria-label="Primary"
          className="flex items-center gap-1 sm:gap-2 flex-1 justify-center"
        >
          {primaryLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "relative inline-flex items-center rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all duration-150",
                  "hover:bg-slate-900/80 hover:text-slate-50",
                  active
                    ? "text-slate-50 bg-slate-900/90 shadow-[0_0_16px_rgba(56,189,248,0.45)] border border-cyan-500/60"
                    : "text-slate-300 border border-transparent",
                ].join(" ")}
              >
                <span>{link.name}</span>
                {/* Accent underline when active */}
                {active && (
                  <span className="pointer-events-none absolute -bottom-[6px] left-4 right-4 h-px bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-300" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: secondary links + notifications + profile/auth */}
        <div className="flex items-center gap-4 min-w-[170px] justify-end">
          {/* Secondary nav (Roles / Versioning) */}
          <nav
            aria-label="Secondary"
            className="hidden md:flex items-center gap-2 pr-2 border-r border-slate-800/70"
          >
            {secondaryLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    "text-[11px] font-medium px-2 py-1 rounded-lg transition-colors",
                    active
                      ? "text-sky-200 bg-slate-900/90 border border-slate-700"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80",
                  ].join(" ")}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Notifications + profile / auth */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/notifications"
              className="relative inline-flex items-center justify-center rounded-full bg-slate-900/90 border border-slate-700 h-8 w-8 text-slate-300 hover:text-slate-50 hover:border-slate-500 transition-colors"
              aria-label="Notifications"
            >
              {/* Simple bell glyph without adding an icon lib */}
              <span className="text-[14px]">🔔</span>
              {/* Example badge – can be wired later */}
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 border border-slate-900" />
            </Link>

            {isLoaded && isSignedIn ? (
              <ProfileMenu />
            ) : (
              <button
                className="inline-flex items-center gap-1 rounded-full bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/30 hover:bg-cyan-400 disabled:opacity-60 disabled:shadow-none transition-transform hover:-translate-y-[1px]"
                onClick={() => router.push("/sign-in?redirect=/dashboard")}
                type="button"
                disabled={!isLoaded}
              >
                <span>Sign in / Sign up</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
