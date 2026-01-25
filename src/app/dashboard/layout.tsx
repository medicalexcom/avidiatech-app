"use client";

import React, { useEffect, useState } from "react";
import PlanModal from "@/components/PlanModal";
import TopNav from "@/components/TopNav";
import Sidebar from "@/components/Sidebar";
import MobileTopNav from "@/components/MobileTopNav";
import { useUser } from "@clerk/nextjs";

/**
 * Dashboard layout (shell)
 * - Renders TopNav and Sidebar
 * - Shows hard-blocking PlanModal when the signed-in user has no active subscription/trial
 *
 * Layout normalization (2026-01):
 * - Use a flex-column root with 100dvh and make the shell `flex-1` so pages do not
 *   show extra blank space at the bottom when content is short.
 * - Avoid brittle calc(100vh - navHeight).
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
        // Conservative behavior: if we can't verify, block access with the modal
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

  // Avoid flashing content while status is loading
  if (!checked) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="text-sm text-slate-600 dark:text-slate-300">Checking access…</div>
      </div>
    );
  }

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

        {/* Shell layout: render Sidebar and main content. */}
        <div className="dashboard-shell flex-1 flex">
          <aside className="hidden md:block">
            <Sidebar />
          </aside>

          <main className="flex-1 md:ml-56">
            {children}
          </main>
        </div>
      </div>

      {/* Hard-blocking PlanModal overlay (portaled) */}
      {showModal && <PlanModal onActivated={onActivated} />}
    </>
  );
}
