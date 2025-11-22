"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * PlanModal - Hard-blocking paywall modal
 *
 * - Non-closable: no close button, Escape is ignored
 * - Focus-trapped: Tab cycles within the modal
 * - Blocking overlay covers entire viewport and prevents any clicks/keys outside modal
 * - Uses /api/checkout/session to create a Stripe Checkout session
 * - Polls /api/subscription/status after checkout / when session_id present
 *
 * Styling uses Tailwind utilities. Adjust to match your design system.
 */

export default function PlanModal({ onActivated }: { onActivated?: () => void }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [checking, setChecking] = useState(true);
  const [active, setActive] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<null | string>(null);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstFocusableRef = useRef<HTMLButtonElement | null>(null);
  const focusableRefs = useRef<HTMLElement[]>([]);

  // helper: fetch subscription status from your endpoint
  async function fetchStatus() {
    try {
      const res = await fetch("/api/subscription/status");
      const data = await res.json();
      const isActive = Boolean(data?.active);
      setActive(isActive);
      if (isActive) {
        onActivated?.();
      }
      return isActive;
    } catch (err) {
      console.error("status fetch error", err);
      // be conservative: treat as not active
      return false;
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    // On mount: check status. If active -> no modal display (parent should hide it).
    let mounted = true;
    (async () => {
      if (!isLoaded) return;
      const isActive = await fetchStatus();
      if (mounted && isActive) setActive(true);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // If user returns from Stripe (session_id in query), start polling for activation
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return;

    let stop = false;
    const interval = setInterval(async () => {
      const got = await fetchStatus();
      if (got || stop) {
        clearInterval(interval);
      }
    }, 3000);

    // stop after 5 minutes as a safety
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 5 * 60 * 1000);

    return () => {
      stop = true;
      clearInterval(interval);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // Focus trap: gather focusable elements and trap Tab/Shift+Tab
  useEffect(() => {
    if (!modalRef.current) return;
    const modal = modalRef.current;

    const selectors = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const nodes = Array.from(modal.querySelectorAll<HTMLElement>(selectors));
    focusableRefs.current = nodes;

    // focus first element
    if (nodes.length && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Do NOT close on Escape; swallow it
        e.preventDefault();
        e.stopPropagation();
      } else if (e.key === "Tab") {
        const focusables = focusableRefs.current;
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);
        let nextIndex = currentIndex;
        if (e.shiftKey) {
          nextIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
        } else {
          nextIndex = currentIndex === focusables.length - 1 ? 0 : currentIndex + 1;
        }
        e.preventDefault();
        focusables[nextIndex]?.focus();
      } else {
        // block other keys from bubbling to page if necessary
      }
    }

    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [active, checking]);

  // Start checkout for a plan
  async function startPlan(plan: "starter" | "growth" | "pro") {
    setError(null);
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Failed to create checkout session");
      }
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      console.error("startPlan error", err);
      setError(err?.message || "Failed to start checkout");
      setLoadingPlan(null);
    }
  }

  // User clicked "I already paid / check status" to re-check
  async function manualCheck() {
    setChecking(true);
    const ok = await fetchStatus();
    if (ok) setActive(true);
  }

  // If active, don't render (parent may remove modal)
  if (active) return null;

  // Ensure no accidental rendering before we check
  if (checking && !isLoaded) {
    // Show nothing until Clerk finishes init
    return null;
  }

  // Modal markup (non-closable)
  const modal = (
    <div
      aria-modal="true"
      role="dialog"
      aria-label="Choose a plan"
      className="fixed inset-0 z-[9999] flex items-center justify-center"
    >
      {/* full-screen backdrop — blocks all interaction */}
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Centered dialog */}
      <div
        ref={modalRef}
        className="relative z-[10000] w-full max-w-md mx-4 rounded-lg bg-white dark:bg-slate-900 shadow-lg p-6"
        role="document"
      >
        <h2 className="text-lg font-semibold mb-3">Choose a plan</h2>
        <p className="text-sm text-slate-600 mb-4">Start your 14‑day trial by choosing a plan.</p>

        <div className="flex flex-col gap-3">
          <button
            ref={firstFocusableRef}
            onClick={() => startPlan("starter")}
            className="w-full rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium"
            type="button"
            disabled={Boolean(loadingPlan)}
          >
            {loadingPlan === "starter" ? "Redirecting…" : "Start Starter — 14‑day trial"}
          </button>

          <button
            onClick={() => startPlan("growth")}
            className="w-full rounded-md border border-slate-200 bg-white text-sm px-4 py-2"
            type="button"
            disabled={Boolean(loadingPlan)}
          >
            {loadingPlan === "growth" ? "Redirecting…" : "Start Growth — 14‑day trial"}
          </button>

          <button
            onClick={() => startPlan("pro")}
            className="w-full rounded-md border border-slate-200 bg-white text-sm px-4 py-2"
            type="button"
            disabled={Boolean(loadingPlan)}
          >
            {loadingPlan === "pro" ? "Redirecting…" : "Start Pro — 14‑day trial"}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={manualCheck}
            className="text-sm underline text-slate-600"
            type="button"
            disabled={checking}
          >
            Already completed checkout? Check status
          </button>

          <div className="text-sm text-slate-500">
            {/* show small help text */}
            {error ? <span className="text-red-600">{error}</span> : <span>Secure Stripe checkout</span>}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}

