"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

const plans = [
  { value: "starter" as const, label: "Starter", price: "$49/mo", desc: "Up to 500 SKUs" },
  { value: "growth" as const, label: "Growth", price: "$149/mo", desc: "Up to 5,000 SKUs" },
  { value: "pro" as const, label: "Pro", price: "$399/mo", desc: "Unlimited SKUs" },
];

export default function TrialSetupPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<"starter" | "growth" | "pro">("starter");

  async function startCheckout() {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push(`/sign-in?redirect=/trial-setup`);
      return;
    }
    setLoading(true);
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
      setLoading(false);
    }
  }

  if (!isLoaded) return null;

  return (
    <div className="dark relative min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute -bottom-20 right-0 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle,rgba(148,163,184,0.5) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg,#06b6d4 0%,#8b5cf6 100%)" }} />
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" fill="none" className="h-10 w-10" aria-hidden="true">
            <rect width="28" height="28" rx="7" fill="url(#ts1)" />
            <path d="M8 20L11.5 9h5L20 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="9.5" y1="16.5" x2="18.5" y2="16.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="ts1" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
          </svg>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">AvidiaTech</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-semibold text-slate-50">Start your 14-day trial</h1>
          <p className="mt-1.5 text-[13px] text-slate-400">
            Choose a plan and begin your free trial. No charge until the trial ends.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
              <p className="text-[13px] text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {!isSignedIn ? (
            <div className="mt-6 space-y-3">
              <p className="text-[13px] text-slate-600 dark:text-slate-400">You must sign in to start a trial.</p>
              <button
                className="w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:opacity-50"
                onClick={() => router.push(`/sign-in?redirect=/trial-setup`)}
                disabled={!isLoaded}
              >
                Sign in / Sign up
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {/* Plan selector */}
              <div className="space-y-2">
                <label className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Choose plan
                </label>
                <div className="space-y-2">
                  {plans.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPlan(p.value)}
                      className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        plan === p.value
                          ? "border-cyan-400 bg-cyan-50 dark:border-cyan-500/50 dark:bg-cyan-500/10"
                          : "border-slate-200 bg-slate-50 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                      }`}
                    >
                      <div>
                        <p className={`text-[13px] font-semibold ${plan === p.value ? "text-cyan-700 dark:text-cyan-300" : "text-slate-800 dark:text-slate-100"}`}>
                          {p.label}
                        </p>
                        <p className="text-[11px] text-slate-400">{p.desc}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[13px] font-semibold ${plan === p.value ? "text-cyan-700 dark:text-cyan-300" : "text-slate-300"}`}>
                          {p.price}
                        </p>
                        <p className="text-[10px] text-slate-400">after trial</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={startCheckout}
                disabled={loading}
                className="w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Redirecting to checkout…" : "Start free trial →"}
              </button>

              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                No credit card charge until trial ends. Cancel any time.
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link href="/dashboard/pricing" className="text-[12px] text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition">
            Compare all plans →
          </Link>
        </div>
      </div>
    </div>
  );
}
