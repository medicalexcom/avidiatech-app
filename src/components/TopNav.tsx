"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import ProfileMenu from "./ProfileMenu";
import { LogoMark } from "@/components/brand/LogoMark";

const primaryLinks = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Analytics", href: "/dashboard/analytics" },
  { name: "Visualize", href: "/dashboard/visualize" },
];

const secondaryLinks = [
  { name: "Roles", href: "/dashboard/roles" },
  { name: "Versioning", href: "/dashboard/versioning" },
];

/** Minimal SVG icon set — avoids any icon library dependency */
function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10 2a6 6 0 00-6 6v2.586l-1.293 1.293A1 1 0 003 13h14a1 1 0 00.707-1.707L16 10.586V8a6 6 0 00-6-6z" />
      <path d="M8 17a2 2 0 004 0" />
    </svg>
  );
}


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
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/92">
      <div className="flex h-[58px] w-full items-center justify-between gap-4 px-4 lg:px-5">

        {/* ── Left: brand mark + wordmark ─────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-2.5">
          <LogoMark className="h-8 w-8 shrink-0" />
          <div className="hidden flex-col leading-none sm:flex">
            <span className="text-[14px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
              AvidiaTech
            </span>
            <span className="text-[11px] font-medium tracking-wide text-slate-400 dark:text-slate-500">
              Product Data OS
            </span>
          </div>

          {/* Live indicator pill */}
          <span className="hidden items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 sm:inline-flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </div>

        {/* ── Center: primary navigation ───────────────────────────────────── */}
        <nav
          aria-label="Primary"
          className="flex flex-1 items-center justify-center gap-0.5"
        >
          {primaryLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "relative inline-flex items-center rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-100",
                ].join(" ")}
              >
                {link.name}
                {active && (
                  <span className="pointer-events-none absolute -bottom-[9px] left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-transparent" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Right: secondary nav + notifications + profile ───────────────── */}
        <div className="flex shrink-0 items-center gap-3">
          {/* Secondary nav — Roles / Versioning */}
          <nav
            aria-label="Secondary"
            className="hidden items-center gap-1 border-r border-slate-200/80 pr-3 dark:border-slate-800 md:flex"
          >
            {secondaryLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                      : "text-slate-500 hover:bg-slate-100/70 hover:text-slate-800 dark:text-slate-500 dark:hover:bg-slate-800/70 dark:hover:text-slate-300",
                  ].join(" ")}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Notifications */}
          <Link
            href="/dashboard/notifications"
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 shadow-sm transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Notifications"
          >
            <BellIcon className="h-[15px] w-[15px]" />
            {/* Notification dot */}
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full border-[1.5px] border-white bg-rose-500 dark:border-slate-900" />
          </Link>

          {/* Profile / auth */}
          {isLoaded && isSignedIn ? (
            <ProfileMenu />
          ) : (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-indigo-700 hover:shadow disabled:opacity-50"
              onClick={() => router.push("/sign-in?redirect=/dashboard")}
              type="button"
              disabled={!isLoaded}
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
