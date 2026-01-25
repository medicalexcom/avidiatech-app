"use client";

import React, { useEffect, useState } from "react";
import PlanModal from "@/components/PlanModal";
import TopNav from "@/components/TopNav";
import Sidebar from "@/components/Sidebar";
import MobileTopNav from "@/components/MobileTopNav";
import AppFooter from "@/components/layout/AppFooter";
import { useUser } from "@clerk/nextjs";

/**
 * Dashboard layout (shell)
 *
 * Sticky footer rules (with fixed Sidebar):
 * - Root: min-h-[100dvh] flex flex-col
 * - Content row: flex-1 min-h-0 flex  (fills remaining height)
 * - Footer: normal flow after content row (NOT fixed)
 *
 * Important:
 * - Remove min-h calc hacks from the shell; they conflict with a real footer.
 * - Sidebar is fixed on desktop; we reserve footer height via Sidebar bottom offset (see Sidebar.tsx).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function check() {
      if (!isLoaded) return;
      if (!isSignedIn) {
        setShowModal(false);
        setChecked(true);
        return;
      }
      try {
        const res = await fetch("/api/subscription/status");
        const data = await res.json();
        if (!mounted) return;
        setShowModal(!data?.active);
      } catch (err) {
        console.error("subscription status fetch failed:", err);
        setShowModal(true);
      } finally {
        if (mounted) setChecked(true);
      }
    }
    check();
    return () => {
      mounted = false;
    };
  }, [isLoaded, isSignedIn]);

  function onActivated() {
    setShowModal(false);
  }

  if (!checked) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-sm text-slate-600">Checking access…</div>
      </div>
    );
  }

  const version = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <>
      <div className="min-h-[100dvh] flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 overscroll-none">
        {/* Top navigation */}
        <div className="hidden md:block">
          <TopNav />
        </div>
        <div className="md:hidden">
          <MobileTopNav />
        </div>

        {/* Content row */}
        <div className="dashboard-shell flex-1 min-h-0 flex">
          <aside className="hidden md:block">
            <Sidebar />
          </aside>

          {/* Use div so pages can keep their own <main> */}
          <div className="flex-1 min-h-0 md:ml-56">
            {children}
          </div>
        </div>

        <AppFooter version={version} />
      </div>

      {showModal && <PlanModal onActivated={onActivated} />}
    </>
  );
}
