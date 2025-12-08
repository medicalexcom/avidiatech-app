// src/components/MobileTopNav.tsx
"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Sidebar from "./Sidebar";
import ProfileMenu from "./ProfileMenu";

function getCurrentModule(pathname: string | null): string {
  if (!pathname) return "Dashboard";
  // Expecting routes like /dashboard/extract, /dashboard/seo, etc.
  const parts = pathname.split("/").filter(Boolean);
  const moduleSlug = parts[1] ?? "dashboard"; // ["dashboard", "extract", ...]
  if (!moduleSlug) return "Dashboard";
  return moduleSlug.charAt(0).toUpperCase() + moduleSlug.slice(1);
}

export default function MobileTopNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const currentModule = getCurrentModule(pathname || "/dashboard");

  // Auto-close drawer when route changes (tap a link in Sidebar)
  React.useEffect(() => {
    if (open) {
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Fixed mobile top bar */}
      <header className="fixed top-0 inset-x-0 z-40 flex items-center justify-between border-b border-slate-200/70 bg-background/90 px-3 py-2 backdrop-blur-sm shadow-[0_1px_0_rgba(15,23,42,0.06)] dark:border-slate-800/80 dark:bg-slate-950/95 dark:shadow-[0_1px_0_rgba(15,23,42,0.85)] md:hidden">
        <div className="flex items-center gap-2">
          {/* Logo mark (simple placeholder) */}
          <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300" />

          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-500">
              AvidiaTech
            </span>
            <div className="flex items-center gap-1.5">
              {/* Current module as a subtle pill */}
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100">
                {currentModule}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Profile / auth – same behavior as TopNav, just more compact */}
          {isLoaded && isSignedIn ? (
            <ProfileMenu />
          ) : (
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500"
              onClick={() => router.push("/sign-in?redirect=/dashboard")}
              disabled={!isLoaded}
            >
              Sign in
            </button>
          )}

          {/* Menu toggle */}
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            {/* Simple hamburger icon */}
            <span className="block h-[14px] w-[16px]" aria-hidden="true">
              <span className="block h-[2px] w-full rounded bg-slate-700 dark:bg-slate-200" />
              <span className="mt-[3px] block h-[2px] w-full rounded bg-slate-700 dark:bg-slate-200" />
              <span className="mt-[3px] block h-[2px] w-full rounded bg-slate-700 dark:bg-slate-200" />
            </span>
          </button>
        </div>
      </header>

      {/* Spacer so content doesn't hide under fixed header on mobile */}
      <div className="h-12 md:hidden" />

      {/* Overlay + Drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setOpen(false)}
          />

          {/* Drawer with existing Sidebar inside */}
          <nav className="fixed inset-y-0 left-0 z-50 flex w-[70%] max-w-[14rem] flex-col border-r border-slate-200 bg-white shadow-[0_0_40px_rgba(15,23,42,0.22)] transition-transform duration-200 ease-out md:hidden dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_0_40px_rgba(15,23,42,0.85)]">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700" />
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    AvidiaTech
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Workspace
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900/80"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              >
                {/* Simple close icon */}
                <span className="text-base leading-none" aria-hidden="true">
                  ×
                </span>
              </button>
            </div>

            {/* Drawer body: reuse your Sidebar */}
            <div className="flex-1 overflow-y-auto">
              <Sidebar variant="drawer" />
            </div>
          </nav>
        </>
      )}
    </>
  );
}
