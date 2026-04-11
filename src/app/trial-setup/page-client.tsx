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
    <div className="relative min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12 overflow-hidden dark:bg-[#09090b]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-[-5%] h-[500px] w-[500px] rounded-full bg-indigo-400/12 blur-[120px] dark:bg-indigo-500/8" />
        <div className="absolute bottom-0 left-[-5%] h-[400px] w-[400px] rounded-full bg-violet-400/10 blur-[100px] dark:bg-violet-500/8" />
      </div>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "linear-gradient(90deg,#6366f1 0%,#8b5cf6 50%,#0ea5e9 100%)" }} />
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-600/25">
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M5 15L8.5 5h3L15 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="6.5" y1="11.5" x2="13.5" y2="11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">AvidiaTech</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Start your 14-day trial</h1>
          <p className="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400">
            Choose a plan and begin your free trial. No charge until the trial ends.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
              <p className="text-[13px] text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {!isSignedIn ? (
            <div className="mt-6 space-y-3">
              <p className="text-[13px] text-slate-600 dark:text-slate-300">You must sign in to start a trial.</p>
              <button
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
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
                          ? "border-indigo-400 bg-indigo-50 dark:border-indigo-500/50 dark:bg-indigo-500/10"
                          : "border-slate-200 bg-slate-50 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                      }`}
                    >
                      <div>
                        <p className={`text-[13px] font-semibold ${plan === p.value ? "text-indigo-700 dark:text-indigo-300" : "text-slate-800 dark:text-slate-100"}`}>
                          {p.label}
                        </p>
                        <p className="text-[11px] text-slate-400">{p.desc}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[13px] font-semibold ${plan === p.value ? "text-indigo-700 dark:text-indigo-300" : "text-slate-300"}`}>
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
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Redirecting to checkout…" : "Start free trial →"}
              </button>

              {/* Trust row */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0" aria-hidden="true">
                      <rect x="2.5" y="6" width="9" height="7" rx="1" /><path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" />
                    </svg>
                    Secured by Stripe
                  </span>
                  <span className="h-2.5 w-px bg-slate-700" />
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0" aria-hidden="true">
                      <path d="M2.5 7l3 3L11.5 4" />
                    </svg>
                    No charge until trial ends
                  </span>
                  <span className="h-2.5 w-px bg-slate-700" />
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0" aria-hidden="true">
                      <path d="M2.5 7l3 3L11.5 4" />
                    </svg>
                    Cancel any time
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10.5px]">
                  <a href="/privacy" className="text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline transition">Privacy policy</a>
                  <span className="text-slate-700">·</span>
                  <a href="/terms" className="text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline transition">Terms of service</a>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link href="/dashboard/pricing" className="text-[12px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
            Compare all plans →
          </Link>
        </div>
      </div>
    </div>
  );
}
