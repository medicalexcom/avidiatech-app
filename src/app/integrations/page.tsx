"use client";

import React, { useEffect, useState } from "react";
import IntegrationRow from "@/components/connectors/IntegrationRow";
import { ToastProvider } from "@/components/ui/toast";

export default function IntegrationsPageClient() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/v1/integrations`)
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        if (d.ok) setIntegrations(d.integrations ?? d);
        else {
          // fallback: some endpoints return an array directly
          if (Array.isArray(d)) setIntegrations(d);
        }
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch integrations", e);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ToastProvider>
      <div className="p-4">
        <h1 className="text-xl font-semibold mb-4">Integrations</h1>
        {loading ? (
          <p>Loading…</p>
        ) : integrations.length === 0 ? (
          <p className="text-sm text-gray-500">No integrations found.</p>
        ) : (
          <div className="space-y-2">
            {integrations.map((it) => (
              <IntegrationRow
                key={it.id}
                integration={it}
                onDeleted={(id) => setIntegrations((s) => s.filter((x) => x.id !== id))}
                onSynced={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </ToastProvider>
  );
}
