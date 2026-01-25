"use client";

import React, { useEffect, useState } from "react";
import PlanModal from "@/components/PlanModal";
import TopNav from "@/components/TopNav";
import Sidebar from "@/components/Sidebar";
import MobileTopNav from "@/components/MobileTopNav";
import AppFooter from "@/components/layout/AppFooter";
import { useUser } from "@clerk/nextjs";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [checked, setChecked] = useState(false);

  React.useEffect(() => {
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
      <div className="min-h-[100dvh] flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="hidden md:block">
          <TopNav />
        </div>
        <div className="md:hidden">
          <MobileTopNav />
        </div>

        {/* Row */}
        <div className="dashboard-shell flex-1 min-h-0 flex">
          <aside className="hidden md:block">
            <Sidebar />
          </aside>

          {/* Dashboard scroll container (not the whole window) */}
          <div className="flex-1 min-h-0 md:ml-56 overflow-y-auto overscroll-y-none">
            {/* children render their own <main> etc */}
            {children}

            {/* Sticky footer lives INSIDE scroller */}
            <AppFooter version={version} />
          </div>
        </div>
      </div>

      {showModal && <PlanModal onActivated={() => setShowModal(false)} />}
    </>
  );
}
