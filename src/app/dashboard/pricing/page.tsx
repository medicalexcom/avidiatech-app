"use client";

import { useState } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";

export default function Pricing() {
  const { isLoaded, isSignedIn } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choosePlan(plan: "basic" | "pro" | "enterprise") {
    if (!isSignedIn) {
      setError("You must sign in to choose a plan.");
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
      if (!res.ok || !data?.url) throw new Error(data?.error || "Failed to create checkout");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded) return null;

  return (
    <div className="p-6">
      <h2>Choose a plan</h2>
      {error && <div className="text-red-600">{error}</div>}
      {!isSignedIn ? (
        <SignInButton>
          <button className="btn-primary mt-3">Sign in / Sign up</button>
        </SignInButton>
      ) : (
        <div className="mt-4 space-x-3">
          <button onClick={() => choosePlan("basic")} disabled={loading} className="btn">
            {loading ? "..." : "Start Basic (14-day trial)"}
          </button>
          <button onClick={() => choosePlan("pro")} disabled={loading} className="btn">
            Start Pro (14-day trial)
          </button>
          <button onClick={() => choosePlan("enterprise")} disabled={loading} className="btn">
            Start Enterprise (14-day trial)
          </button>
        </div>
      )}
    </div>
  );
}
