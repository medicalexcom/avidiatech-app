"use client";

import { useState } from "react";

export default function TrialSetupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/session", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Failed to create checkout session");
      }
      // redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Unknown error");
      console.error("startCheckout error", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-8 bg-white rounded shadow">
        <h1 className="text-xl font-semibold">Start trial</h1>
        <p className="mt-2 text-sm text-slate-600">Start your free trial — complete subscription to unlock premium features.</p>

        {error && <div className="mt-4 text-red-600">{error}</div>}

        <div className="mt-6">
          <button onClick={startCheckout} disabled={loading} className="btn-primary">
            {loading ? "Starting..." : "Start free trial"}
          </button>
        </div>
      </div>
    </main>
  );
}
