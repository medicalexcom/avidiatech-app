"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

interface TenantResponse {
  tenant?: { tenantId: string; tenantName: string; role: string };
  subscription?: {
    plan_name: string;
    status: string;
    current_period_end: string;
    ingestion_quota?: number | null;
    description_quota?: number | null;
  } | null;
  usage?: {
    ingestion_count?: number;
    description_count?: number;
    period_start?: string;
  } | null;
}

export default function DashboardPage() {
  const userState = clerkEnabled ? useUser() : { isLoaded: true, user: null } as any;
  const { isLoaded, user } = userState;
  const [data, setData] = useState<TenantResponse>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    const load = async () => {
      try {
        const res = await fetch("/api/v1/tenants/me");
        if (!res.ok) {
          const { error: message } = await res.json();
          setError(message || "Unable to load tenant context");
          return;
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      }
    };
    load();
  }, [isLoaded]);

  return (
    <main className="p-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-700">
          Welcome {user?.fullName || user?.primaryEmailAddress?.emailAddress}, you're signed in with Clerk and
          connected to your workspace.
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {data.tenant && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Workspace</h2>
            <p className="text-sm text-gray-600">{data.tenant.tenantName}</p>
            <p className="text-xs text-gray-500">Role: {data.tenant.role}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Subscription</h2>
            <p className="text-sm text-gray-700">Plan: {data.subscription?.plan_name || "n/a"}</p>
            <p className="text-sm text-gray-700">Status: {data.subscription?.status || "unknown"}</p>
            {data.subscription?.current_period_end && (
              <p className="text-xs text-gray-500">
                Renews {new Date(data.subscription.current_period_end).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        Clerk authentication is enforced for all dashboard routes, and tenant context is resolved automatically to power
        API keys, billing, and usage enforcement.
      </div>

      {data.usage && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Usage this period</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p>Ingestion: {data.usage.ingestion_count ?? 0} / {data.subscription?.ingestion_quota ?? "∞"}</p>
            <p>Descriptions: {data.usage.description_count ?? 0} / {data.subscription?.description_quota ?? "∞"}</p>
          </div>
        </div>
      )}
    </main>
  );
}
