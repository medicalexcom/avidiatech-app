"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// A simple component that fetches and displays subscription and usage
// information for a tenant.  This replaces the static bullet list
// from the original SubscriptionPage.  To use it in your Next.js app,
// place this file at `src/app/dashboard/subscription/page.tsx` and make
// sure the environment variables NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_ANON_KEY are defined.  You will also need a
// backend API route to handle Stripe checkout for plan changes.

interface SubscriptionData {
  planName: string;
  status: string;
  currentPeriodEnd: string;
  usage: Record<string, { used: number; quota: number }>;
}

export default function SubscriptionPage() {
  const [tenantId, setTenantId] = useState("");
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Supabase client once on the client side.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  async function fetchSubscription() {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      // Query your `tenant_subscriptions` table (adjust table/column names
      // according to your schema).  Assume it contains `tenant_id`,
      // `plan_name`, `status`, `current_period_end`, and usage columns.
      const { data: rows, error: supabaseError } = await supabase
        .from("tenant_subscriptions")
        .select(
          "plan_name, status, current_period_end, ingestion_used, ingestion_quota, seo_used, seo_quota, variant_used, variant_quota"
        )
        .eq("tenant_id", tenantId)
        .limit(1);
      if (supabaseError) throw supabaseError;
      if (!rows || rows.length === 0) {
        setError("No subscription found for tenant.");
        setData(null);
        setLoading(false);
        return;
      }
      const row = rows[0];
      const usage = {
        ingestion: {
          used: row.ingestion_used || 0,
          quota: row.ingestion_quota || 0,
        },
        seo: {
          used: row.seo_used || 0,
          quota: row.seo_quota || 0,
        },
        variant: {
          used: row.variant_used || 0,
          quota: row.variant_quota || 0,
        },
      };
      setData({
        planName: row.plan_name,
        status: row.status,
        currentPeriodEnd: row.current_period_end,
        usage,
      });
    } catch (err: any) {
      setError(err.message || "Failed to fetch subscription.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-3xl font-bold">Subscription & Usage</h1>
      <p>Enter a tenant ID to load subscription details:</p>
      <div className="flex space-x-2">
        <input
          type="text"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          className="border rounded p-2 flex-1"
          placeholder="Tenant ID"
        />
        <button
          onClick={fetchSubscription}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading || !tenantId}
        >
          {loading ? "Loading…" : "Load"}
        </button>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      {data && (
        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">Plan Details</h2>
          <p>
            <strong>Plan:</strong> {data.planName}
          </p>
          <p>
            <strong>Status:</strong> {data.status}
          </p>
          <p>
            <strong>Next Renewal:</strong>{" "}
            {new Date(data.currentPeriodEnd).toLocaleDateString()}
          </p>
          <h2 className="text-xl font-semibold mt-4 mb-2">Usage Counters</h2>
          <ul className="list-disc ml-6 space-y-1">
            {Object.entries(data.usage).map(([key, { used, quota }]) => (
              <li key={key}>
                {key.charAt(0).toUpperCase() + key.slice(1)}: {used} / {quota}
              </li>
            ))}
          </ul>
          {/* Placeholder for upgrade/downgrade and invoice history */}
          <div className="mt-4">
            <button
              onClick={() => {
                // TODO: Implement calling your Stripe checkout API route here
                alert(
                  "Plan change flow not yet implemented. Implement checkout session call."
                );
              }}
              className="bg-green-500 text-white px-4 py-2 rounded mr-2"
            >
              Change Plan
            </button>
            <button
              onClick={() => {
                // TODO: Redirect to Stripe customer portal or open invoice history
                alert(
                  "Invoice history and customer portal not yet implemented."
                );
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Billing Portal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
