"use client";

import React, { useEffect, useState } from "react";

type Summary = {
  plan?: string;
  renewal?: string;
  usage?: {
    ingests:      { used: number; limit: number };
    translations: { used: number; limit: number };
  };
  isOwner?: boolean;
};

function pct(used: number, limit: number) {
  if (!limit) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const p = pct(used, limit);
  const color =
    p >= 90 ? "bg-red-500"
    : p >= 70 ? "bg-amber-500"
    : "bg-indigo-600";
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <rect x="3" y="7" width="10" height="8" rx="1.5" />
      <path d="M5 7V5a3 3 0 016 0v2" />
    </svg>
  );
}

export default function BillingPanel() {
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [opening, setOpening]     = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  async function loadSummary() {
    setLoading(true);
    setFetchError(null);
    try {
      const res  = await fetch("/api/billing/summary");
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Server error ${res.status}`);
      setSummary(json || null);
    } catch (err: any) {
      setFetchError(err?.message || "Unable to load billing information.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSummary(); }, []);

  async function openPortal() {
    setOpening(true);
    setPortalError(null);
    try {
      const r    = await fetch("/api/billing/portal", { method: "POST" });
      const json = await r.json().catch(() => null);
      if (r.ok && json?.url) {
        window.open(json.url, "_blank");
      } else {
        setPortalError(json?.error || "Unable to open billing portal. Please try again.");
      }
    } catch {
      setPortalError("Network error. Please check your connection and try again.");
    } finally {
      setOpening(false);
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-4xl space-y-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
          <div className="skeleton mb-4 h-5 w-48 rounded-lg" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="skeleton h-24 rounded-xl" />
            <div className="skeleton col-span-2 h-24 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── Fetch error state ──────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="max-w-4xl">
        <div className="rounded-2xl border border-red-200/60 bg-red-50/60 p-6 dark:border-red-500/20 dark:bg-red-500/8">
          <p className="text-[13px] font-semibold text-red-700 dark:text-red-400">
            Could not load billing information
          </p>
          <p className="mt-1 text-[12px] text-red-600/80 dark:text-red-400/70">{fetchError}</p>
          <button
            onClick={loadSummary}
            className="mt-4 inline-flex h-8 items-center rounded-lg border border-red-200 bg-white px-3 text-[12px] font-medium text-red-700 shadow-sm transition hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Non-owner view ─────────────────────────────────────────────────
  if (!summary?.isOwner) {
    return (
      <div className="max-w-4xl">
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">Billing</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            Billing information is only available to account owners. Contact your organization owner to manage subscription and payment details.
          </p>
        </div>
      </div>
    );
  }

  const plan    = summary.plan    ?? "Starter";
  const renewal = summary.renewal ?? "—";
  const ing     = summary.usage?.ingests      ?? { used: 0, limit: 0 };
  const tr      = summary.usage?.translations ?? { used: 0, limit: 0 };

  return (
    <div className="max-w-4xl space-y-4">

      {/* ── Main billing card ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-card dark:border-slate-800 dark:bg-slate-900/80">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">Subscription &amp; Billing</h2>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              Manage your subscription, invoices, and payment methods.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <button
              onClick={openPortal}
              disabled={opening}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {opening ? "Opening…" : "Manage billing →"}
            </button>
            {portalError && (
              <p className="text-[11.5px] text-red-600 dark:text-red-400">{portalError}</p>
            )}
          </div>
        </div>

        {/* Plan + usage grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* Plan card */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Active plan
            </p>
            <p className="mt-1.5 text-[22px] font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {plan}
            </p>
            <p className="mt-2 text-[11.5px] text-slate-500 dark:text-slate-400">
              Renews {renewal}
            </p>
          </div>

          {/* Usage card */}
          <div className="col-span-2 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Usage this period
            </p>

            <div className="mt-3 space-y-4">
              <div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-slate-600 dark:text-slate-300">Product ingests</span>
                  <span className="tabular-nums text-slate-500 dark:text-slate-400">
                    {ing.used.toLocaleString()} / {ing.limit.toLocaleString()}
                  </span>
                </div>
                <UsageBar used={ing.used} limit={ing.limit} />
              </div>

              <div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-slate-600 dark:text-slate-300">Translations</span>
                  <span className="tabular-nums text-slate-500 dark:text-slate-400">
                    {tr.used.toLocaleString()} / {tr.limit.toLocaleString()}
                  </span>
                </div>
                <UsageBar used={tr.used} limit={tr.limit} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Trust row ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-2xl border border-slate-200/60 bg-slate-50/60 px-4 py-3 dark:border-slate-800/60 dark:bg-slate-900/50">
        <span className="flex items-center gap-1.5 text-[11.5px] text-slate-400 dark:text-slate-500">
          <LockIcon />
          Payments secured by Stripe
        </span>
        <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
        <span className="text-[11.5px] text-slate-400 dark:text-slate-500">256-bit TLS encryption</span>
        <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
        <span className="text-[11.5px] text-slate-400 dark:text-slate-500">Cancel any time</span>
        <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
        <a href="/legal/privacy" className="text-[11.5px] text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline dark:text-slate-500 dark:hover:text-slate-300">
          Privacy policy
        </a>
      </div>
    </div>
  );
}
