"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import ProfileMenu from "./ProfileMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

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
      return pathname === "/dashboard";
    }
    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/90">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
        {/* Left: brand + workspace */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-500">
              AvidiaTech
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Product Data OS
            </span>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] text-slate-600 sm:inline-flex dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live dashboard
          </span>
        </div>

        {/* Center: primary navigation */}
        <nav
          aria-label="Primary"
          className="flex flex-1 items-center justify-center gap-1 sm:gap-2"
        >
          {primaryLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "relative inline-flex items-center rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all duration-150",
                  active
                    ? [
                        "border",
                        "border-cyan-500/70",
                        "bg-slate-900 text-slate-50 shadow-[0_0_16px_rgba(56,189,248,0.45)]",
                        "dark:bg-slate-900",
                      ].join(" ")
                    : [
                        "border border-transparent",
                        "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        "dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-slate-50",
                      ].join(" "),
                ].join(" ")}
              >
                <span>{link.name}</span>
                {active && (
                  <span className="pointer-events-none absolute -bottom-[6px] left-4 right-4 h-px bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-300" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: secondary links + theme + notifications + profile/auth */}
        <div className="flex min-w-[190px] items-center justify-end gap-4">
          {/* Secondary nav (Roles / Versioning) */}
          <nav
            aria-label="Secondary"
            className="hidden items-center gap-2 border-r border-slate-200 pr-2 dark:border-slate-800/70 md:flex"
          >
            {secondaryLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    "rounded-lg px-2 py-1 text-[11px] font-medium transition-colors",
                    active
                      ? "border border-slate-300 bg-slate-100 text-sky-700 dark:border-slate-700 dark:bg-slate-900/90 dark:text-sky-200"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900/80 dark:hover:text-slate-200",
                  ].join(" ")}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <Link
              href="/dashboard/notifications"
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-50"
              aria-label="Notifications"
            >
              <span className="text-[14px]">🔔</span>
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border border-white bg-rose-500 dark:border-slate-900" />
            </Link>

            {/* Profile / auth */}
            {isLoaded && isSignedIn ? (
              <ProfileMenu />
            ) : (
              <button
                className="inline-flex items-center gap-1 rounded-full bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-500/30 transition-transform hover:-translate-y-[1px] hover:bg-cyan-400 disabled:opacity-60 disabled:shadow-none"
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
