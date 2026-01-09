"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ConnectorManager from "@/components/integrations/ConnectorManager";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useToast } from "@/components/ui/toast";
import ConnectModal from "@/components/integrations/ConnectModal";

/* providers list */
const PROVIDERS = [
  { id: "bigcommerce", name: "BigCommerce", desc: "Full-featured storefront", available: true },
  { id: "shopify", name: "Shopify", desc: "Shopify stores", available: true },
  { id: "woocommerce", name: "WooCommerce", desc: "WordPress commerce", available: true },
  { id: "magento", name: "Magento", desc: "Enterprise stores", available: false },
  { id: "squarespace", name: "Squarespace", desc: "Squarespace commerce", available: false },
];

export default function IntegrationsPage() {
  const router = useRouter();
  const toast = useToast();
  const { integrations, activeIntegrations, refresh, disconnect, testConnection } = useIntegrations();

  const [orgId, setOrgId] = useState<string>("");
  const [connectorManagerOpen, setConnectorManagerOpen] = useState(false);
  const [connectorManagerProvider, setConnectorManagerProvider] = useState<string | null>(null);

  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectProvider, setConnectProvider] = useState<string | null>(null);

  const ecommerceList = useMemo(() => (integrations || []).filter((i) => i.platform || i.provider), [integrations]);

  async function handleDisconnect(id: string, platform?: string) {
    if (!confirm("Disconnect this integration? Stored credentials will be removed (you can reconnect later).")) return;
    try {
      await disconnect(id, platform);
      toast.success("Disconnected");
      await refresh();
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    }
  }

  async function handleTest(id: string) {
    try {
      const res = await testConnection(id);
      const ok = res?.result?.ok ?? !!res?.ok;
      toast.success(ok ? "Connection OK" : `Test result: ${res?.result?.status ?? "error"}`);
      return res;
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
      throw err;
    }
  }

  function openConnect(providerId: string) {
    setConnectProvider(providerId);
    setConnectModalOpen(true);
  }

  function openConnectorManagerFallback(provider?: string | null) {
    setConnectorManagerProvider(provider ?? null);
    setConnectorManagerOpen(true);
    setConnectModalOpen(false);
    toast.info("Opening connector manager for advanced flow");
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Hero */}
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Integrations</h1>
        <p className="mt-2 text-sm text-slate-600">Connect AvidiaTech to your store and data sources.</p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Connected integrations */}
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
                      <button onClick={() => handleTest(i.id)} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">
                        Test connection
                      </button>

                      <button onClick={() => handleDisconnect(i.id, i.platform)} className="px-3 py-1 bg-rose-600 text-white rounded text-sm">
                        Disconnect
                      </button>

                      <button
                        onClick={() => {
                          setConnectorManagerProvider(i.provider ?? i.platform ?? null);
                          setConnectorManagerOpen(true);
                        }}
                        className="px-3 py-1 border rounded text-sm"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-md border bg-white dark:bg-slate-900">
                <div className="text-sm text-slate-600">No active integrations. Connect a store from the catalog.</div>
              </div>
            )}
          </div>
        </section>

        {/* Catalogue / Connect */}
        <aside className="col-span-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Available integrations</h3>
            <p className="text-sm text-slate-500">Select a provider to get started</p>
          </div>

          <div className="grid gap-3">
            {PROVIDERS.map((p) => (
              <div key={p.id} className="p-3 rounded-md border bg-white dark:bg-slate-900 flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.desc}</div>
                </div>

                <div>
                  {p.available ? (
                    <button onClick={() => openConnect(p.id)} className="px-3 py-1 bg-sky-600 text-white rounded text-sm">
                      Connect
                    </button>
                  ) : (
                    <button disabled className="px-3 py-1 border rounded text-sm text-slate-400">
                      Coming soon
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Provider-aware Connect modal (uses schema where available, else falls back) */}
      <ConnectModal
        provider={connectProvider}
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onSuccess={() => refresh()}
        onOpenConnectorManager={() => openConnectorManagerFallback(connectProvider)}
      />

      {/* ConnectorManager fallback (only used when modal requests fallback or user explicitly opens it) */}
      {connectorManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Connector manager{connectorManagerProvider ? ` — ${connectorManagerProvider}` : ""}</h3>
              <button onClick={() => { setConnectorManagerOpen(false); setConnectorManagerProvider(null); }} className="px-2 py-1">Close</button>
            </div>

            <ConnectorManager orgId={orgId as any} selectedId={""} onSelect={() => {}} initialProvider={connectorManagerProvider ?? undefined} />

            <div className="mt-4 flex justify-end">
              <button onClick={() => { setConnectorManagerOpen(false); setConnectorManagerProvider(null); refresh(); }} className="px-3 py-1 rounded bg-sky-600 text-white">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
