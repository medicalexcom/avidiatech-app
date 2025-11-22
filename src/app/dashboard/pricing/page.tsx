"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choosePlan(plan: "starter" | "growth" | "pro") {
    if (!isLoaded) return;
    if (!isSignedIn) {
      // navigate to the full-page sign-in (no modal)
      router.push(`/sign-in?redirect=/dashboard/pricing`);
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
      console.error("choosePlan error", err);
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded) return null;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold">Choose a plan</h2>
      {error && <div className="mt-4 text-red-600">{error}</div>}

      {!isSignedIn ? (
        <div className="mt-4">
          <p className="mb-2">Sign in to pick a plan.</p>
          <button
            className="btn-primary"
            onClick={() => router.push(`/sign-in?redirect=/dashboard/pricing`)}
            disabled={!isLoaded}
          >
            Sign in / Sign up
          </button>
        </div>
      ) : (
        <div className="mt-4 flex gap-4">
          <button className="btn" onClick={() => choosePlan("starter")} disabled={loading}>
            {loading ? "..." : "Start Starter — 14‑day trial"}
          </button>
          <button className="btn" onClick={() => choosePlan("growth")} disabled={loading}>
            Start Growth — 14‑day trial
          </button>
          <button className="btn" onClick={() => choosePlan("pro")} disabled={loading}>
            Start Pro — 14‑day trial
          </button>
        </div>
      )}
    </div>
  );
}
