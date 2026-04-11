"use client";

import React, { useEffect, useState } from "react";
import PlanModal from "@/components/PlanModal";
import TopNav from "@/components/TopNav";
import Sidebar from "@/components/Sidebar";
import MobileTopNav from "@/components/MobileTopNav";
import AppFooter from "@/components/layout/AppFooter";
import { SupportButton } from "@/components/SupportButton";
import { useUser } from "@clerk/nextjs";

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
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950">
        {/* Animated spinner */}
        <div className="relative h-8 w-8">
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-500 dark:border-slate-800 dark:border-t-cyan-400" />
        </div>
        <p className="text-[12px] font-medium text-slate-400 dark:text-slate-500">
          Checking access…
        </p>
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

        {/* Content row; pb-12 reserves space for the fixed footer */}
        <div className="dashboard-shell flex-1 flex pb-12">
          <aside className="hidden md:block">
            <Sidebar />
          </aside>

          {/* Main content — stretches to fill remaining height, bg matches layout */}
          <div className="flex-1 md:ml-56 flex flex-col min-h-0">{children}</div>
        </div>

        {/* Fixed footer overlay */}
        <AppFooter version={version} />
      </div>

      {showModal && <PlanModal onActivated={onActivated} />}
      <SupportButton />
    </>
  );
}
