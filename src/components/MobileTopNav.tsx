// src/components/MobileTopNav.tsx
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

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
      <header className="fixed top-0 inset-x-0 z-40 flex items-center justify-between border-b bg-background/80 px-3 py-2 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          {/* Logo mark (simple placeholder) */}
          <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300" />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-semibold tracking-tight">
              AvidiaTech
            </span>
            <span className="text-[11px] text-muted-foreground">
              {currentModule}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Avatar placeholder – wire to Clerk user later if you want */}
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium"
          >
            RR
          </button>

          {/* Menu toggle */}
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border"
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
          <nav className="fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-xs flex-col border-r bg-background md:hidden">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-3 py-3 border-b">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300" />
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-semibold tracking-tight">
                    AvidiaTech
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Workspace
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border"
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
