"use client";

import { useEffect, useState } from "react";

interface SubscriptionData {
  plan_name?: string;
  status?: string;
  current_period_end?: string;
  ingestion_quota?: number | null;
  description_quota?: number | null;
}

interface UsageData {
  ingestion_count?: number;
  description_count?: number;
  period_start?: string;
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/v1/tenants/me");
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || "Unable to load subscription");
          return;
        }
        setSubscription(json.subscription);
        setUsage(json.usage);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const gotoBillingPortal = async () => {
    setRedirecting(true);
    try {
      const res = await fetch("/api/v1/billing/portal", { method: "POST" });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        setError(json.error || "Unable to open billing portal");
      }
    } finally {
      setRedirecting(false);
    }
  };

  const startCheckout = async () => {
    setRedirecting(true);
    try {
      const res = await fetch("/api/v1/billing/checkout", { method: "POST" });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        setError(json.error || "Unable to start checkout");
      }
    } finally {
      setRedirecting(false);
    }
  };

  if (loading) return <p className="p-4">Loading subscription...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription & Usage</h1>
        <p className="text-gray-700">Stripe-backed billing with quotas enforced before each API call.</p>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-semibold">Plan</h2>
          <p className="text-sm text-gray-700">{subscription?.plan_name || "Not set"}</p>
          <p className="text-sm text-gray-500">Status: {subscription?.status || "unknown"}</p>
          {subscription?.current_period_end && (
            <p className="text-xs text-gray-500">
              Renews {new Date(subscription.current_period_end).toLocaleDateString()}
            </p>
          )}
          <div className="mt-4 flex gap-2 text-sm">
            <button
              onClick={startCheckout}
              disabled={redirecting}
              className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
            >
              {redirecting ? "Redirecting..." : "Change plan"}
            </button>
            <button
              onClick={gotoBillingPortal}
              disabled={redirecting}
              className="rounded border border-gray-300 px-3 py-2 text-gray-800 disabled:opacity-50"
            >
              Billing portal
            </button>
          </div>
        </div>

        <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-semibold">Usage this period</h2>
          <div className="space-y-3 text-sm text-gray-800">
            <UsageBar
              label="Ingestion"
              used={usage?.ingestion_count || 0}
              quota={subscription?.ingestion_quota ?? null}
            />
            <UsageBar
              label="Descriptions"
              used={usage?.description_count || 0}
              quota={subscription?.description_quota ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageBar({ label, used, quota }: { label: string; used: number; quota: number | null }) {
  const percent = quota ? Math.min(100, Math.round((used / quota) * 100)) : null;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span>
          {used} / {quota ?? "∞"} {percent !== null ? `(${percent}% )` : ""}
        </span>
      </div>
      <div className="mt-1 h-2 rounded bg-gray-100">
        <div
          className="h-2 rounded bg-blue-600"
          style={{ width: `${percent ?? 100}%` }}
        />
      </div>
    </div>
  );
}
