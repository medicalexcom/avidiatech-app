"use client";

import { useEffect, useMemo, useState } from "react";
import { PLAN_CONFIG, type PlanInfo, type PlanSlug, normalizePlanSlug } from "@/config/plans";

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
  const [planMeta, setPlanMeta] = useState<PlanInfo | null>(null);
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
        const resolvedPlan = PLAN_CONFIG[normalizePlanSlug(json.subscription?.plan_name || json.plan?.slug)];
        setPlanMeta(resolvedPlan);
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

  const startCheckout = async (plan?: PlanSlug) => {
    setRedirecting(true);
    try {
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
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

  const currentPlanName = subscription?.plan_name || planMeta?.name || "Starter";
  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : "";

  const planCards = useMemo(() => Object.values(PLAN_CONFIG), []);

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
          <p className="text-sm text-gray-700">{currentPlanName}</p>
          <p className="text-sm text-gray-500">Status: {subscription?.status || "unknown"}</p>
          {renewalDate && (
            <p className="text-xs text-gray-500">Renews {renewalDate}</p>
          )}
          <div className="mt-4 flex gap-2 text-sm">
            <button
              onClick={() => startCheckout(planMeta?.slug)}
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
              quota={subscription?.ingestion_quota ?? planMeta?.ingestionQuota ?? null}
            />
            <UsageBar
              label="Descriptions"
              used={usage?.description_count || 0}
              quota={subscription?.description_quota ?? planMeta?.descriptionQuota ?? null}
            />
            {usage?.period_start && (
              <p className="text-xs text-gray-500">Period starting {usage.period_start}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Plan tiers</h2>
            <p className="text-sm text-gray-600">Starter, Growth, and Pro mapped to Stripe checkout.</p>
          </div>
          <button
            onClick={() => startCheckout(planMeta?.slug)}
            disabled={redirecting}
            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 disabled:opacity-50"
          >
            Go to checkout
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {planCards.map((plan) => {
            const isCurrent = normalizePlanSlug(planMeta?.slug) === plan.slug;
            return (
              <div
                key={plan.slug}
                className={`rounded border ${isCurrent ? "border-blue-500" : "border-gray-200"} bg-gray-50 p-4 shadow-sm`}
              >
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs uppercase text-gray-500">{plan.name}</p>
                    <p className="text-2xl font-semibold">{plan.price}</p>
                  </div>
                  {isCurrent && <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">Current</span>}
                </div>
                <p className="mt-2 text-sm text-gray-700">{plan.description}</p>
                <ul className="mt-3 space-y-1 text-sm text-gray-700">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="text-blue-600">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => startCheckout(plan.slug)}
                  disabled={redirecting || isCurrent}
                  className="mt-4 w-full rounded bg-blue-600 px-3 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isCurrent ? "Current plan" : `Choose ${plan.name}`}
                </button>
              </div>
            );
          })}
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
