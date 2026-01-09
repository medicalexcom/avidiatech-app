"use client";

import React, { useMemo, useState } from "react";
import { useIntegrations } from "@/hooks/useIntegrations";
import IntegrationRow from "@/components/connectors/IntegrationRow";
import { useToast } from "@/components/ui/toast";

const PROVIDERS = [
  { id: "bigcommerce", name: "BigCommerce", desc: "Full-featured B2C/B2B storefront", available: true },
  { id: "shopify", name: "Shopify", desc: "Shopify stores", available: true },
  { id: "woocommerce", name: "WooCommerce", desc: "WordPress commerce", available: true },
  { id: "magento", name: "Magento", desc: "Enterprise stores", available: false },
  { id: "squarespace", name: "Squarespace", desc: "Squarespace commerce", available: false },
];

export default function IntegrationsPage() {
  const { integrations, activeIntegrations, refresh, connect, disconnect, testConnection, loading } = useIntegrations();
  const toast = useToast();
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  const ecommerceList = useMemo(() => (integrations || []).filter((i) => i.platform || ["bigcommerce", "shopify", "woocommerce", "magento", "squarespace"].includes(i.provider || "")), [integrations]);

  async function handleDisconnect(id: string, platform?: string) {
    if (!confirm("Disconnect this integration? Stored credentials will be removed (you can reconnect later).")) return;
    try {
      await disconnect(id, platform);
      toast.success("Disconnected");
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    }
  }

  async function handleTest(id: string) {
    setTesting((s) => ({ ...s, [id]: true }));
    try {
      const result = await testConnection(id);
      toast.success("Test result: " + (result?.result?.ok ? "OK" : `Error ${result?.result?.status}`));
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    } finally {
      setTesting((s) => ({ ...s, [id]: false }));
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Hero */}
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Integrations</h1>
        <p className="mt-2 text-sm text-slate-600">Connect AvidiaTech to your store and data sources. Securely store credentials and manage syncing.</p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Connected Integrations */}
        <section className="col-span-8">
          <div className="mb-4">
            <h2 className="text-xl font-medium">Connected integrations</h2>
            <p className="text-sm text-slate-500">Active connections for this tenant</p>
          </div>

          <div className="space-y-3">
            {(activeIntegrations && activeIntegrations.length > 0) ? (
              activeIntegrations.map((i) => (
                <div key={i.id} className="p-4 rounded-md border bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{i.name ?? i.provider ?? i.platform}</div>
                      <div className="text-xs text-slate-500">{i.platform ?? i.provider}</div>
                      <div className="text-xs text-slate-400 mt-1">Last update: {i.updated_at ?? "—"}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => handleTest(i.id)} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm" disabled={testing[i.id]}>
                        {testing[i.id] ? "Testing…" : "Test connection"}
                      </button>

                      <button onClick={() => handleDisconnect(i.id, i.platform)} className="px-3 py-1 bg-rose-600 text-white rounded text-sm">
                        Disconnect
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-md border bg-white dark:bg-slate-900">
                <div className="text-sm text-slate-600">No active integrations. Connect a store from the catalog below.</div>
              </div>
            )}
          </div>
        </section>

        {/* Right: Catalog */}
        <aside className="col-span-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Available integrations</h3>
            <p className="text-sm text-slate-500">Select a provider to get started</p>
          </div>

          <div className="grid gap-3">
            {PROVIDERS.map((p) => {
              const available = p.available;
              return (
                <div key={p.id} className="p-3 rounded-md border bg-white dark:bg-slate-900 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.desc}</div>
                  </div>

                  <div>
                    {available ? (
                      <button
                        onClick={() => connect(p.id)}
                        className="px-3 py-1 bg-sky-600 text-white rounded text-sm"
                      >
                        Connect
                      </button>
                    ) : (
                      <button disabled className="px-3 py-1 border rounded text-sm text-slate-400">
                        Coming soon
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
