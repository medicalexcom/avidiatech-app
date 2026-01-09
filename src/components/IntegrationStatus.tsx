"use client";

import React from "react";
import Link from "next/link";
import { useIntegrations } from "@/hooks/useIntegrations";

export default function IntegrationStatus() {
  const { activeIntegrations, loading } = useIntegrations();

  const connected = (activeIntegrations?.length ?? 0) > 0;
  const first = activeIntegrations && activeIntegrations.length > 0 ? activeIntegrations[0] : null;

  return (
    <div className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-md p-3 shadow-sm border">
      <div>
        <div className="text-sm font-medium">{connected ? "Connected" : "Not connected"}</div>
        <div className="text-xs text-slate-500">
          {loading ? "Checking…" : connected ? `${first?.platform ?? first?.provider ?? first?.name}` : "No active store"}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Link href="/integrations" className="px-3 py-1 bg-sky-600 text-white rounded text-sm">
          Manage integrations
        </Link>

        {!connected ? (
          <Link href="/integrations" className="px-3 py-1 border rounded text-sm">
            Connect a store
          </Link>
        ) : null}
      </div>
    </div>
  );
}
