"use client";

import React, { useEffect, useState } from "react";

/**
 * BillingPanel
 * - fetches /api/billing/summary (backend should return plan, renewal, usage)
 * - shows plan card, usage meters, Manage Billing -> opens portal
 */

type Summary = {
  plan?: string;
  renewal?: string;
  usage?: { ingests: { used: number; limit: number }; translations: { used: number; limit: number } };
  isOwner?: boolean;
};

export default function BillingPanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/billing/summary");
        const json = await res.json();
        setSummary(json || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function openPortal() {
    setOpening(true);
    try {
      const r = await fetch("/api/billing/portal", { method: "POST" });
      const j = await r.json();
      if (r.ok && j.url) window.open(j.url, "_blank");
      else alert(j?.error || "No billing portal available");
    } catch (err) {
      console.error(err);
      alert("Failed to open billing portal");
    } finally {
      setOpening(false);
    }
  }

  if (loading) return <div>Loading…</div>;
  if (!summary) return <div>Unable to load billing summary</div>;

  if (!summary.isOwner) {
    return (
      <div className="max-w-4xl">
        <div className="bg-white dark:bg-slate-900 border rounded-lg p-6">
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="mt-2 text-sm text-slate-500">Billing information is available to account owners only. Contact your organization owner to manage billing.</p>
        </div>
      </div>
    );
  }

  const plan = summary.plan ?? "Starter";
  const renewal = summary.renewal ?? "—";
  const ing = summary.usage?.ingests ?? { used: 0, limit: 0 };
  const tr = summary.usage?.translations ?? { used: 0, limit: 0 };

  function pct(u: number, l: number) {
    if (!l) return 0;
    return Math.min(100, Math.round((u / l) * 100));
  }

  return (
    <div className="max-w-4xl">
      <div className="bg-white dark:bg-slate-900 border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Subscription & Billing</h2>
            <p className="text-sm text-slate-500 mt-1">Manage subscription, billing, and usage.</p>
          </div>
          <div>
            <button onClick={openPortal} disabled={opening} className="px-4 py-2 bg-indigo-600 text-white rounded">
              {opening ? "Opening…" : "Open Stripe Portal"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="col-span-1 border rounded p-4">
            <div className="text-xs text-slate-500">Plan</div>
            <div className="text-xl font-semibold mt-1">{plan}</div>
            <div className="text-sm text-slate-500 mt-2">Renewal: {renewal}</div>
          </div>

          <div className="col-span-2 border rounded p-4">
            <div className="text-sm font-medium">Usage</div>

            <div className="mt-3">
              <div className="flex justify-between text-xs">
                <div>Product ingests</div>
                <div>{ing.used} / {ing.limit}</div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded mt-1">
                <div style={{ width: `${pct(ing.used, ing.limit)}%` }} className="h-2 bg-indigo-600 rounded" />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs">
                <div>Translations</div>
                <div>{tr.used} / {tr.limit}</div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded mt-1">
                <div style={{ width: `${pct(tr.used, tr.limit)}%` }} className="h-2 bg-indigo-600 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
