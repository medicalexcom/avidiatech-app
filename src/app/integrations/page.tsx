"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import IntegrationRow from "@/components/connectors/IntegrationRow";
import ConnectorManager from "@/components/integrations/ConnectorManager";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useToast } from "@/components/ui/toast";

/**
 * Integrations page — wired connect/disconnect/test flows.
 *
 * - BigCommerce: inline connect modal that POSTs to /api/v1/integrations/ecommerce/bigcommerce
 * - Other providers: open ConnectorManager (reuse existing UI)
 */

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
  const { integrations, activeIntegrations, refresh, disconnect, testConnection, loading } = useIntegrations();

  const [showConnectorManager, setShowConnectorManager] = useState(false);
  const [cmProvider, setCmProvider] = useState<string | null>(null);

  // BigCommerce connect modal state
  const [showBCModal, setShowBCModal] = useState(false);
  const [bcStoreHash, setBcStoreHash] = useState("");
  const [bcAccessToken, setBcAccessToken] = useState("");
  const [bcLoading, setBcLoading] = useState(false);

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

  // Connect: provider dispatcher
  function openConnect(providerId: string) {
    if (providerId === "bigcommerce") {
      setBcStoreHash("");
      setBcAccessToken("");
      setShowBCModal(true);
      return;
    }
    // for other providers reuse existing ConnectorManager UI (embedded)
    setCmProvider(providerId);
    setShowConnectorManager(true);
  }

  async function submitBigCommerceConnect() {
    if (!bcStoreHash.trim() || !bcAccessToken.trim()) {
      toast.error("storeHash and access token required");
      return;
    }
    setBcLoading(true);
    try {
      const res = await fetch("/api/v1/integrations/ecommerce/bigcommerce", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storeHash: bcStoreHash.trim(), accessToken: bcAccessToken.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? json?.detail ?? `Connect failed (${res.status})`);
        return;
      }
      toast.success("BigCommerce connected");
      setShowBCModal(false);
      await refresh();
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    } finally {
      setBcLoading(false);
    }
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

                      <button onClick={() => { /* open details drawer using IntegrationRow or ConnectorDetailsDrawer if desired */ }} className="px-3 py-1 border rounded text-sm">
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
                        onClick={() => openConnect(p.id)}
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

      {/* BigCommerce Connect Modal */}
      {showBCModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 dark:bg-slate-900">
            <h3 className="text-lg font-medium mb-2">Connect BigCommerce</h3>
            <p className="text-sm text-slate-500 mb-4">Enter your store hash and API token (store API).</p>

            <div className="space-y-3">
              <label className="block text-xs text-slate-600">Store hash</label>
              <input className="w-full rounded border px-3 py-2" value={bcStoreHash} onChange={(e) => setBcStoreHash(e.target.value)} />

              <label className="block text-xs text-slate-600">Access token</label>
              <input className="w-full rounded border px-3 py-2" value={bcAccessToken} onChange={(e) => setBcAccessToken(e.target.value)} />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowBCModal(false)} className="px-3 py-1 rounded border">Cancel</button>
              <button
                onClick={submitBigCommerceConnect}
                disabled={bcLoading}
                className="px-4 py-1 rounded bg-sky-600 text-white"
              >
                {bcLoading ? "Connecting…" : "Connect BigCommerce"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ConnectorManager modal fallback for other providers */}
      {showConnectorManager && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Connect {cmProvider}</h3>
              <button onClick={() => { setShowConnectorManager(false); setCmProvider(null); }} className="px-2 py-1">Close</button>
            </div>

            {/* Reuse existing ConnectorManager component to handle creation flows */}
            <ConnectorManager orgId={undefined as any} selectedId={""} onSelect={() => {}} providerFilter={cmProvider ?? undefined} />

            <div className="mt-4 flex justify-end">
              <button onClick={() => { setShowConnectorManager(false); setCmProvider(null); refresh(); }} className="px-3 py-1 rounded bg-sky-600 text-white">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
