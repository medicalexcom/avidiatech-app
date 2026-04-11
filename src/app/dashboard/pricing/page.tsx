"use client";

import { useState } from "react";
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
    color: "cyan",
    accentBg: "bg-cyan-50 dark:bg-cyan-500/10",
    accentBorder: "border-cyan-200 dark:border-cyan-500/30",
    accentText: "text-cyan-700 dark:text-cyan-300",
    buttonCls: "bg-cyan-600 hover:bg-cyan-700 text-white",
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

  async function choosePlan(plan: "starter" | "growth" | "pro") {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push(`/sign-in?redirect=/dashboard`);
      return;
    }
    setLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error || "Failed to create checkout session");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(null);
    }
  }

  if (!isLoaded) return null;

  return (
    <PageShell glow="cyan">
      <PageHeader
        glow="cyan"
        kicker="Pricing"
        dot="bg-cyan-500"
        title={
          <>
            Simple, transparent{" "}
            <span className="bg-gradient-to-r from-cyan-500 to-violet-500 bg-clip-text text-transparent">
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
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl border p-6 ${
              plan.highlighted
                ? `${plan.accentBorder} ${plan.accentBg}`
                : "border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/80"
            } shadow-card`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-[11px] font-semibold ${plan.accentBg} ${plan.accentText} border ${plan.accentBorder} shadow-sm`}>
                  Most popular
                </span>
              </div>
            )}

            <div className="mb-4">
              <span className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${plan.accentText}`}>
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
              disabled={!isLoaded || loading !== null}
              className={`mb-5 w-full rounded-xl py-2.5 text-[13px] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${plan.buttonCls}`}
            >
              {loading === plan.id ? "Redirecting…" : `Start ${plan.name} — 14-day trial`}
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
        ))}
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
    </PageShell>
  );
}
