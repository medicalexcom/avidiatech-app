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
 * Footer-safe layout rules:
 * - Root is flex-col with min-h-[100dvh]
 * - The sidebar/content "row" is flex-1
 * - Footer is rendered AFTER the row (full width)
 * - Add bottom padding to the scroll/content area so it doesn't visually collide with footer.
 *
 * Note: Sidebar on desktop is position:fixed (see Sidebar.tsx), so it will not "shrink"
 * for the footer. The pb-12 on the content row prevents the UI from feeling broken.
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

        {/* Row (sidebar + content). pb-12 reserves room matching footer height. */}
        <div className="dashboard-shell flex-1 flex pb-12">
          <aside className="hidden md:block">
            <Sidebar />
          </aside>

          {/* Use div (not <main>) so pages can keep their own <main> */}
          <div className="flex-1 md:ml-56">{children}</div>
        </div>

        {/* Full-width footer */}
        <AppFooter version={version} />
      </div>

      {showModal && <PlanModal onActivated={onActivated} />}
    </>
  );
}
