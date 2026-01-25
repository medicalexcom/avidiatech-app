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
 * - Dashboard-only sticky footer (not fixed; no overlap)
 * - IMPORTANT: do NOT add extra bottom padding here (it creates extra scroll/gap).
 * - Use a content row that is flex-1, then render footer after it.
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-slate-600">Checking access…</div>
      </div>
    );
  }

  const version = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <>
      <div className="min-h-[100dvh] flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        {/* Top navigation */}
        <div className="hidden md:block">
          <TopNav />
        </div>
        <div className="md:hidden">
          <MobileTopNav />
        </div>

        {/* Row: Sidebar + main content */}
        <div className="dashboard-shell flex-1 flex">
          <aside className="hidden md:block">
            <Sidebar />
          </aside>

          {/* Use div to avoid nested <main> tags */}
          <div className="flex-1 md:ml-56">{children}</div>
        </div>

        <AppFooter version={version} />
      </div>

      {showModal && <PlanModal onActivated={onActivated} />}
    </>
  );
}
