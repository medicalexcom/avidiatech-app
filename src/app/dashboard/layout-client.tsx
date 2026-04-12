"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import PlanModal from "@/components/PlanModal";
import TopNav from "@/components/TopNav";
import Sidebar from "@/components/Sidebar";
import MobileTopNav from "@/components/MobileTopNav";
import AppFooter from "@/components/layout/AppFooter";
import { SupportButton } from "@/components/SupportButton";
import { useUser } from "@clerk/nextjs";

// ─── Trial countdown banner ───────────────────────────────────────────────────
function TrialBanner({ daysLeft, onDismiss }: { daysLeft: number; onDismiss: () => void }) {
  const urgent = daysLeft <= 3;
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 text-[12px] font-medium ${
        urgent
          ? "bg-rose-600 text-white"
          : "bg-amber-500 text-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6" /><path d="M8 5v3.5l2 1.5" />
        </svg>
        <span>
          {daysLeft === 0
            ? "Your free trial ends today."
            : `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`}{" "}
          <Link href="/dashboard/pricing" className="underline underline-offset-2 hover:no-underline">
            Upgrade now to keep access →
          </Link>
        </span>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 opacity-80 hover:opacity-100 transition"
        aria-label="Dismiss trial banner"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [checked, setChecked] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [showTrialBanner, setShowTrialBanner] = useState(false);

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

    async function fetchTrialInfo() {
      if (!isLoaded || !isSignedIn) return;
      try {
        const res = await fetch("/api/billing/summary");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.status === "trialing" && typeof data?.daysUntilRenewal === "number") {
          setTrialDaysLeft(data.daysUntilRenewal);
          // Only show banner if not previously dismissed this session
          const dismissed = sessionStorage.getItem("trialBannerDismissed");
          if (!dismissed) setShowTrialBanner(true);
        }
      } catch (_) {}
    }

    check();
    fetchTrialInfo();
    return () => {
      mounted = false;
    };
  }, [isLoaded, isSignedIn]);

  function onActivated() {
    setShowModal(false);
  }

  function dismissTrialBanner() {
    setShowTrialBanner(false);
    try { sessionStorage.setItem("trialBannerDismissed", "1"); } catch (_) {}
  }

  if (!checked) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-950">
        {/* Animated spinner */}
        <div className="relative h-8 w-8">
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500 dark:border-slate-800 dark:border-t-indigo-400" />
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
        {/* Trial countdown banner */}
        {showTrialBanner && trialDaysLeft !== null && (
          <TrialBanner daysLeft={trialDaysLeft} onDismiss={dismissTrialBanner} />
        )}

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
