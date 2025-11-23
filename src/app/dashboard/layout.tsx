"use client";

import React, { useEffect, useState } from "react";
import PlanModal from "../../components/PlanModal";
import TopNav from "../../components/TopNav";
import Sidebar from "../../components/Sidebar";
import { useUser } from "@clerk/nextjs";

/**
 * Dashboard layout (shell)
 * - Renders your real TopNav and Sidebar so the true shell is visible under the modal
 * - Shows hard-blocking PlanModal when the user is signed-in and has no active subscription/trial
 *
 * Notes:
 * - PlanModal is portaled to document.body and uses a high z-index so it will sit above TopNav/Sidebar.
 * - Ensure there are no client-side redirects to /dashboard/pricing; users should land on /dashboard so the shell is visible.
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-slate-600">Checking access…</div>
      </div>
    );
  }

  return (
    <>
      {/* Top navigation (your real topbar) */}
      <TopNav />

      {/* Shell layout: render your Sidebar component (short sidebar) and main content */}
      <div className="min-h-[calc(100vh-56px)] flex">
        <aside className="hidden md:block">
          <Sidebar />
        </aside>

        <main className="flex-1 bg-slate-50 dark:bg-slate-950 p-6">
          {children}
        </main>
      </div>

      {/* Hard-blocking PlanModal overlay (portaled) */}
      {showModal && <PlanModal onActivated={onActivated} />}
    </>
  );
}
