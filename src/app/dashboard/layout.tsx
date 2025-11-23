"use client";

import React, { useEffect, useState } from "react";
import PlanModal from "../../components/PlanModal";
import TopNav from "../../components/TopNav";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

/**
 * Dashboard layout (shell)
 * - Renders TopNav and a simple Sidebar so the dashboard shell is visible under PlanModal
 * - Shows hard-blocking PlanModal when user is signed-in but has no active subscription/trial
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
        // conservative: show modal if we can't verify
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

  // Prevent flash while we determine status
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-slate-600">Checking access…</div>
      </div>
    );
  }

  return (
    <>
      {/* Top navigation */}
      <TopNav />

      {/* Shell layout: sidebar + main */}
      <div className="min-h-[calc(100vh-56px)] flex">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-white dark:bg-slate-900 p-4">
          <div className="mb-6 font-bold">AvidiaTech</div>
          <nav className="flex flex-col gap-2 text-sm">
            <Link href="/dashboard" className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">Overview</Link>
            <Link href="/dashboard/analytics" className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">Analytics</Link>
            <Link href="/dashboard/visualize" className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">Visualize</Link>
            <Link href="/dashboard/bulk" className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">Bulk Ops</Link>
            <Link href="/dashboard/notifications" className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">Notifications</Link>
            <hr className="my-3" />
            <Link href="/dashboard/account" className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">Account</Link>
            <Link href="/dashboard/organization" className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">Organization</Link>
          </nav>
        </aside>

        {/* Main content area */}
        <main className="flex-1 bg-slate-50 dark:bg-slate-950 p-6">
          {children}
        </main>
      </div>

      {/* Hard-blocking PlanModal overlay */}
      {showModal && <PlanModal onActivated={onActivated} />}
    </>
  );
}
