"use client";

import React, { useEffect, useState } from "react";
import PlanModal from "../../components/PlanModal";
import { useUser } from "@clerk/nextjs";

/**
 * Dashboard layout:
 * - Renders children (dashboard shell must include topbar/sidebar elsewhere)
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

  // Render dashboard content (shell should be in your app layout). PlanModal overlays and blocks interactions.
  return (
    <>
      <div className="min-h-screen">{children}</div>
      {showModal && <PlanModal onActivated={onActivated} />}
    </>
  );
}
