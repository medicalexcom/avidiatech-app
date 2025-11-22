"use client";

import React, { useEffect, useState } from "react";
import PlanModal from "../../components/PlanModal";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

/**
 * Dashboard layout:
 * - Renders topbar + sidebar + children as usual
 * - Shows hard-blocking PlanModal when user is signed-in but has no active subscription/trial
 * - Modal blocks all interaction; it polls /api/subscription/status after checkout
 */

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function check() {
      if (!isLoaded) return;
      if (!isSignedIn) {
        // Not signed in: let middleware / top nav handle sign-in flow
        setShowModal(false);
        setChecked(true);
        return;
      }

      try {
        const res = await fetch("/api/subscription/status");
        const data = await res.json();
        if (!mounted) return;
        if (!data?.active) {
          // show modal to block usage
          setShowModal(true);
        } else {
          setShowModal(false);
        }
      } catch (err) {
        console.error("subscription status fetch failed:", err);
        // Be conservative: show the modal if we can't verify
        setShowModal(true);
      } finally {
        if (mounted) setChecked(true);
      }
    }

    check();
    return () => {
      mounted = false;
    };
  }, [isLoaded, isSignedIn, router]);

  // Provide a callback so that when PlanModal detects activation it hides itself
  function onActivated() {
    setShowModal(false);
  }

  // Show a loader while we check initial state; prevents flash-of-modal
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-slate-600">Checking access…</div>
      </div>
    );
  }

  return (
    <>
      {/* Render the dashboard layout normally (topbar/sidebars should be present in layout tree) */}
      <div className={`min-h-screen ${showModal ? "pointer-events-auto" : ""}`}>
        {children}
      </div>

      {/* If showModal true, render PlanModal which hard-blocks interactions */}
      {showModal && <PlanModal onActivated={onActivated} />}
    </>
  );
}
