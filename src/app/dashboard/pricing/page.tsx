"use client";

import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import PageShell, { PageHeader } from "@/components/layout/PageShell";

const plans = [
  {
    id: "starter" as const,
    name: "Starter",
    price: "$49",
    period: "/mo",
    description: "Perfect for small catalogs and early-stage merchants testing the platform.",
    color: "indigo",
    accentBg: "bg-indigo-50 dark:bg-indigo-500/10",
    accentBorder: "border-indigo-200 dark:border-indigo-500/30",
    accentText: "text-indigo-700 dark:text-indigo-300",
    buttonCls: "bg-indigo-600 hover:bg-indigo-700 text-white",
    features: [
      "Up to 500 SKUs ingested",
      "500 SEO title runs",
      "250 variant generations",
      "100 matching jobs",
      "Email support",
      "14-day free trial",
    ],
  },
  {
    id: "growth" as const,
    name: "Growth",
    price: "$149",
    period: "/mo",
    description: "For growing e-commerce teams running continuous catalog enrichment workflows.",
    color: "violet",
    accentBg: "bg-violet-50 dark:bg-violet-500/10",
    accentBorder: "border-violet-200 dark:border-violet-500/30",
    accentText: "text-violet-700 dark:text-violet-300",
    buttonCls: "bg-violet-600 hover:bg-violet-700 text-white",
    highlighted: true,
    features: [
      "Up to 5,000 SKUs ingested",
      "5,000 SEO title runs",
      "2,500 variant generations",
      "1,000 matching jobs",
      "Priority email + chat support",
      "14-day free trial",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$399",
    period: "/mo",
    description: "For enterprises and agencies managing large-scale catalogs with full pipeline access.",
    color: "emerald",
    accentBg: "bg-emerald-50 dark:bg-emerald-500/10",
    accentBorder: "border-emerald-200 dark:border-emerald-500/30",
    accentText: "text-emerald-700 dark:text-emerald-300",
    buttonCls: "bg-emerald-600 hover:bg-emerald-700 text-white",
    features: [
      "Unlimited SKU ingestion",
      "Unlimited SEO runs",
      "Unlimited variants",
      "Unlimited matching",
      "Dedicated support + SLA",
      "14-day free trial",
    ],
  },
];

export default function PricingPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Subscription state fetched from API
  const [subState, setSubState] = useState<{
    active: boolean;
    status: string;
    planName: string | null;
    isOwner: boolean;
  } | null>(null);

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch("/api/subscription/status")
      .then((r) => r.json())
      .then((d) => setSubState(d))
      .catch(() => {});
  }, [isLoaded, isSignedIn]);

  // Has an active subscription (owners always count as subscribed)
  const hasSubscription = subState?.active === true;
  // Current plan name (lowercase: "starter" | "growth" | "pro" | null)
  const currentPlan = subState?.planName ?? null;

  async function choosePlan(plan: "starter" | "growth" | "pro") {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push(`/sign-in?redirect=/dashboard/pricing`);
      return;
    }
    // If already on this plan, do nothing
    if (currentPlan === plan) return;

    setLoading(plan);
    setError(null);
    setSuccess(null);

    try {
      if (hasSubscription) {
        // User already subscribed — use update-plan to swap immediately
        const res = await fetch("/api/billing/update-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to update plan");
        const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
        setSuccess(`You are now on the ${planLabel} plan. Changes take effect immediately.`);
        setSubState((prev) => prev ? { ...prev, planName: plan } : prev);
      } else {
        // New subscriber — redirect to Stripe checkout
        const res = await fetch("/api/checkout/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const data = await res.json();
        if (!res.ok || !data?.url) throw new Error(data?.error || "Failed to create checkout session");
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(null);
    }
  }

  if (!isLoaded) return null;

  return (
    <PageShell glow="indigo">
      <PageHeader
        glow="indigo"
        kicker="Pricing"
        dot="bg-indigo-500"
        title={
          <>
            Simple, transparent{" "}
            <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
              pricing.
            </span>
          </>
        }
        description="All plans include a 14-day free trial. No credit card required to start. Upgrade or cancel any time."
      />

      {/* Error banner */}
      {error && (
        <div className="rounded-2xl border border-red-200/80 bg-red-50/80 px-5 py-3 dark:border-red-500/25 dark:bg-red-500/8">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-red-700 dark:text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-sm ml-4">✕</button>
          </div>
        </div>
      )}

      {/* Success banner (plan upgrade/downgrade) */}
      {success && (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-5 py-3 dark:border-emerald-500/25 dark:bg-emerald-500/8">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-emerald-700 dark:text-emerald-400">{success}</p>
            <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-600 text-sm ml-4">✕</button>
          </div>
        </div>
      )}

      {/* Sign-in prompt */}
      {!isSignedIn && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-5 py-4 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">Sign in to start your trial</p>
              <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">Create an account to choose a plan and get started.</p>
            </div>
            <button
              className="inline-flex h-8 items-center rounded-lg bg-slate-900 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              onClick={() => router.push(`/sign-in?redirect=/dashboard/pricing`)}
            >
              Sign in / Sign up
            </button>
          </div>
        </div>
      )}

      {/* Pricing cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
          <div
            key={plan.id}
            className={`relative rounded-2xl border p-6 ${
              isCurrent
                ? `${plan.accentBorder} ${plan.accentBg} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 ${plan.accentBorder.replace("border-", "ring-")}`
                : plan.highlighted
                  ? `${plan.accentBorder} ${plan.accentBg}`
                  : "border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/80"
            } shadow-card`}
          >
            {/* Badge: Current plan takes priority over "Most popular" */}
            {isCurrent ? (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-[12px] font-semibold ${plan.accentBg} ${plan.accentText} border ${plan.accentBorder} shadow-sm`}>
                  <svg viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5"><path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Current plan
                </span>
              </div>
            ) : plan.highlighted ? (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-[12px] font-semibold ${plan.accentBg} ${plan.accentText} border ${plan.accentBorder} shadow-sm`}>
                  Most popular
                </span>
              </div>
            ) : null}

            <div className="mb-4">
              <span className={`text-[12px] font-semibold uppercase tracking-[0.16em] ${plan.accentText}`}>
                {plan.name}
              </span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900 dark:text-slate-50">{plan.price}</span>
                <span className="text-[13px] text-slate-500 dark:text-slate-400">{plan.period}</span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{plan.description}</p>
            </div>

            <button
              onClick={() => choosePlan(plan.id)}
              disabled={!isLoaded || loading !== null || isCurrent}
              className={`mb-5 w-full rounded-xl py-2.5 text-[13px] font-semibold transition shadow-sm
                ${isCurrent
                  ? "cursor-default bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  : `${plan.buttonCls} disabled:opacity-50 disabled:cursor-not-allowed`
                }`}
            >
              {loading === plan.id
                ? (hasSubscription ? "Switching…" : "Redirecting…")
                : isCurrent
                  ? "Current plan"
                  : hasSubscription
                    ? `Switch to ${plan.name}`
                    : `Start ${plan.name} — 14-day trial`}
            </button>

            <ul className="space-y-2.5">
              {plan.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                  <svg className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${plan.accentText}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {feat}
                </li>
              ))}
            </ul>
          </div>
        );
        })}
      </div>

      {/* Enterprise note */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 px-5 py-4 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-50">Need a custom plan?</p>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              For high-volume catalogs, agency resellers, or custom SLA requirements — contact us for Enterprise pricing.
            </p>
          </div>
          <a
            href="mailto:sales@avidiatech.com"
            className="inline-flex h-8 shrink-0 items-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Contact sales →
          </a>
        </div>
      </div>

      {/* Trust row */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 rounded-2xl border border-slate-200/60 bg-slate-50/60 px-5 py-4 dark:border-slate-800/60 dark:bg-slate-900/50">
        {[
          {
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                <rect x="3" y="7" width="10" height="8" rx="1.5" /><path d="M5 7V5a3 3 0 016 0v2" />
              </svg>
            ),
            text: "Payments secured by Stripe",
          },
          {
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                <path d="M8 2L3 5v4c0 3.3 2.3 5.6 5 6.5 2.7-.9 5-3.2 5-6.5V5L8 2z" />
              </svg>
            ),
            text: "256-bit TLS encryption",
          },
          {
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                <path d="M3 8l3.5 3.5L13 4" />
              </svg>
            ),
            text: "No credit card to start",
          },
          {
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
                <path d="M3 8l3.5 3.5L13 4" />
              </svg>
            ),
            text: "Cancel any time",
          },
        ].map((item, i, arr) => (
          <React.Fragment key={item.text}>
            <span className="flex items-center gap-1.5 text-[11.5px] text-slate-400 dark:text-slate-500">
              {item.icon}
              {item.text}
            </span>
            {i < arr.length - 1 && (
              <span className="hidden h-3 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
            )}
          </React.Fragment>
        ))}
        <span className="h-3 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
        <div className="flex items-center gap-3 text-[11.5px]">
          <a href="/legal/privacy" className="text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline dark:text-slate-500 dark:hover:text-slate-300">Privacy</a>
          <a href="/legal/terms" className="text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline dark:text-slate-500 dark:hover:text-slate-300">Terms</a>
        </div>
      </div>
    </PageShell>
  );
}
