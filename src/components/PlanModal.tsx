"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useUser, useClerk } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * PlanModal - Hard-blocking paywall modal (compact features: max 3 per plan)
 *
 * - Non-closable (Escape swallowed), focus-trapped, portaled
 * - Shows three plan cards with price, concise subtitle (<=2 lines) and up to 3 feature bullets
 * - "Compare all plans" toggles a compact comparison table (keeps full details on pricing page)
 * - "Already completed checkout? Check status" polls /api/subscription/status
 * - Includes Sign out and Account actions in the footer so users can escape
 *
 * Keep the modal blocking: it intentionally prevents interaction with the dashboard
 * until the user starts a trial / has an active subscription.
 */

type PlanKey = "starter" | "growth" | "pro";

const PLANS: Record<
  PlanKey,
  { title: string; price: string; subtitle: string; features: string[]; ctaLabel?: string }
> = {
  starter: {
    title: "Starter",
    price: "$49/mo",
    subtitle: "For solopreneurs & small shops who want essential automation.",
    features: [
      "100 product ingests / month",
      "Basic Extraction & Description AI",
      "Basic SEO & Specs extraction",
      // full details live on the pricing page
    ],
    ctaLabel: "Start 14‑day free trial",
  },
  growth: {
    title: "Growth",
    price: "$149/mo",
    subtitle: "For growing e‑commerce teams managing catalogs and workflows.",
    features: [
      "300 product ingests / month",
      "Full Extraction, SEO & Variants",
      "Feeds, Bulk Ops & API (read-only)",
    ],
    ctaLabel: "Start 14‑day free trial",
  },
  pro: {
    title: "Pro / Agency",
    price: "$399/mo",
    subtitle: "For agencies, distributors, and large catalog operations.",
    features: [
      "1,000 product ingests / month",
      "Unlimited users & dedicated queues",
      "Full API (read+write) & agency tools",
    ],
    ctaLabel: "Start 14‑day free trial",
  },
};

export default function PlanModal({ onActivated }: { onActivated?: () => void }) {
  const { isLoaded } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [checking, setChecking] = useState(true);
  const [active, setActive] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<null | PlanKey>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const firstFocusableRef = useRef<HTMLButtonElement | null>(null);
  const focusableRefs = useRef<HTMLElement[]>([]);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/subscription/status");
      const data = await res.json();
      const isActive = Boolean(data?.active);
      setActive(isActive);
      if (isActive) onActivated?.();
      return isActive;
    } catch (err) {
      console.error("status fetch error", err);
      return false;
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isLoaded) return;
      const isActive = await fetchStatus();
      if (mounted && isActive) setActive(true);
    })();
    return () => {
      mounted = false;
    };
  }, [isLoaded]);

  // Poll when returning from Stripe (session_id present)
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return;
    let stop = false;
    const interval = setInterval(async () => {
      const got = await fetchStatus();
      if (got || stop) clearInterval(interval);
    }, 3000);
    const timeout = setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
    return () => {
      stop = true;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [searchParams.toString()]);

  // Focus trap inside modal
  useEffect(() => {
    if (!modalRef.current) return;
    const modal = modalRef.current;
    const selectors =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const nodes = Array.from(modal.querySelectorAll<HTMLElement>(selectors));
    focusableRefs.current = nodes;
    if (nodes.length && firstFocusableRef.current) firstFocusableRef.current.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === "Tab") {
        const focusables = focusableRefs.current;
        if (!focusables.length) {
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
      }
    }

    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [checking, active, showCompare]);

  async function startPlan(plan: PlanKey) {
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

  async function manualCheck() {
    setChecking(true);
    const ok = await fetchStatus();
    if (ok) setActive(true);
  }

  async function handleSignOut() {
    try {
      if (clerk && typeof clerk.signOut === "function") {
        await clerk.signOut();
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error("Sign out failed", err);
      router.push("/");
    }
  }

  if (active) return null;
  if (checking && !isLoaded) return null;

  const planCard = (planKey: PlanKey) => {
    const p = PLANS[planKey];
    const loading = loadingPlan === planKey;
    const visibleFeatures = p.features.slice(0, 3); // show up to 3 features
    return (
      <div key={planKey} className="flex-1 border rounded-lg p-4 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{p.title}</h3>
            <div className="text-sm text-slate-500 leading-tight">{p.subtitle}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{p.price}</div>
            <div className="text-xs text-slate-500">billed monthly</div>
          </div>
        </div>

        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          {visibleFeatures.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="inline-block w-5 h-5 mt-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4">
          <button
            ref={planKey === "starter" ? firstFocusableRef : undefined}
            onClick={() => startPlan(planKey)}
            className={`w-full inline-flex items-center justify-center py-2 px-3 rounded ${loading ? "bg-slate-200 text-slate-700" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
            disabled={Boolean(loadingPlan)}
            type="button"
          >
            {loading ? "Redirecting…" : p.ctaLabel ?? "Start trial"}
          </button>
        </div>
      </div>
    );
  };

  const compareTable = (
    <div className="mt-4 overflow-auto rounded border bg-white dark:bg-slate-900 p-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="pb-2">Feature</th>
            <th className="pb-2">Starter</th>
            <th className="pb-2">Growth</th>
            <th className="pb-2">Pro</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-2">Monthly ingests</td>
            <td>100</td>
            <td>300</td>
            <td>1,000</td>
          </tr>
          <tr className="bg-slate-50 dark:bg-slate-800">
            <td className="py-2">Extraction</td>
            <td>Basic</td>
            <td>Full</td>
            <td>Full</td>
          </tr>
          <tr>
            <td className="py-2">AI Descriptions</td>
            <td>Basic</td>
            <td>Full</td>
            <td>Full</td>
          </tr>
          <tr className="bg-slate-50 dark:bg-slate-800">
            <td className="py-2">API</td>
            <td>—</td>
            <td>Read-only</td>
            <td>Read + Write</td>
          </tr>
          <tr>
            <td className="py-2">Users</td>
            <td>1</td>
            <td>3</td>
            <td>Unlimited</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const modal = (
    <div aria-modal="true" role="dialog" aria-label="Choose a plan" className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/65"></div>

      {/* content */}
      <div
        ref={modalRef}
        className="relative z-[10000] w-full max-w-5xl mx-4 rounded-lg bg-white dark:bg-slate-900 shadow-xl p-6"
        role="document"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Choose a plan</h2>
            <p className="mt-1 text-sm text-slate-600">
              Start your 14‑day free trial. Your trial converts automatically unless canceled.
            </p>
          </div>

          <div className="text-sm text-slate-500">
            <div className="mb-2">Not sure which plan is right for you?</div>
            <button
              onClick={() => setShowCompare((s) => !s)}
              className="inline-flex items-center gap-2 text-sm underline"
              type="button"
            >
              Compare all plans →
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {planCard("starter")}
          {planCard("growth")}
          {planCard("pro")}
        </div>

        {/* Comparison area */}
        {showCompare && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Plan comparison</h3>
            {compareTable}
          </div>
        )}

        {/* Actions + status */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            {error ? <span className="text-red-600">{error}</span> : <span>Secure payment via Stripe</span>}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={manualCheck} className="text-sm underline text-slate-600" type="button" disabled={checking}>
              Already completed checkout? Check status
            </button>

            {/* small hint for pricing */}
            <a href="/dashboard/pricing" className="text-sm text-slate-600 underline">
              View full pricing page
            </a>
          </div>
        </div>

        {/* Footer with sign out / account */}
        <div className="mt-4 border-t pt-4 flex items-center justify-between">
          <div className="text-sm text-slate-500">Need help? Contact support@avidiatech.com</div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/account")}
              className="text-sm underline text-slate-600"
              type="button"
            >
              Account
            </button>

            <button onClick={handleSignOut} className="text-sm text-red-600" type="button">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}
