"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function TrialSetupPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<"starter" | "growth" | "pro">("starter");

  async function startCheckout() {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push(`/sign-in?redirect=/dashboard`);
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
      console.error("startCheckout error", err);
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded) return null;

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-8 bg-white rounded shadow">
        <h1 className="text-xl font-semibold">Start trial</h1>
        <p className="mt-2 text-sm text-slate-600">Start your free trial — complete subscription to unlock premium features.</p>

        {error && <div className="mt-4 text-red-600">{error}</div>}

        {!isSignedIn ? (
          <div className="mt-6">
            <p className="text-sm">You must sign in to start a trial.</p>
            <button
              className="btn-primary mt-2"
              onClick={() => router.push(`/sign-in?redirect=/trial-setup`)}
            >
              Sign in / Sign up
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4">
              <label className="block text-sm">Choose plan</label>
              <select value={plan} onChange={(e) => setPlan(e.target.value as any)} className="mt-2">
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            <div className="mt-6">
              <button onClick={startCheckout} disabled={loading} className="btn-primary">
                {loading ? "Starting..." : "Start free trial"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
