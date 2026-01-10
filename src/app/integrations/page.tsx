"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useToast } from "@/components/ui/toast";
import ConnectModal from "@/components/integrations/ConnectModal";
import ConnectorManager from "@/components/integrations/ConnectorManager";

/**
 * Integrations page — flex layout hotfix
 * - Uses a responsive two-column flex layout to avoid stray grid children creating a 3rd column.
 * - Keeps ConnectModal and ConnectorManager rendered as overlays (fixed), outside the content flow.
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

  const { integrations, activeIntegrations, loading, error, refresh, testConnection, syncConnection } = useIntegrations();

  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectProvider, setConnectProvider] = useState<string | null>(null);

  const [connectorManagerOpen, setConnectorManagerOpen] = useState(false);
  const [connectorManagerProvider, setConnectorManagerProvider] = useState<string | null>(null);

  const [orgId, setOrgId] = useState<string | null>(null);

  // Resolve org id for tenant-aware calls; pass into ConnectModal/ConnectorManager to avoid extra /api/v1/me calls
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/v1/me", { credentials: "same-origin" });
        if (!res.ok) return;
        const j = await res.json().catch(() => null);
        if (j?.org_id) setOrgId(j.org_id);
      } catch {
        // ignore
      }
    })();
  }, []);

  function openConnectModal(providerId: string) {
    setConnectProvider(providerId);
    setConnectModalOpen(true);
  }

  function openConnectorManager(providerId?: string | null) {
    setConnectorManagerProvider(providerId ?? null);
    setConnectorManagerOpen(true);
    setConnectModalOpen(false);
    toast.info("Opening connector manager for advanced flow");
  }

  async function onTest(i: any) {
    try {
      const res = await testConnection(i);
      const ok = res?.ok ?? (res?.result?.ok ?? false);
      if (ok) toast.success("Connection test succeeded");
      else {
        const msg = res?.error ?? res?.detail ?? JSON.stringify(res);
        toast.error(`Test returned: ${msg}`);
      }
      await refresh();
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    }
  }

  async function onSync(i: any) {
    try {
      const res = await syncConnection(i);
      const jobId = res?.jobId ?? res?.id ?? res?.pipelineRunId ?? null;
      toast.success(jobId ? `Sync queued (${jobId})` : "Sync started");
      await refresh();
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    }
  }

  async function onDelete(i: any) {
    if (!confirm("Delete this connection? This will remove stored credentials and cannot be undone.")) return;
    try {
      const res = await fetch(
        i.platform ? `/api/v1/ecommerce_connections/${encodeURIComponent(i.id)}` : `/api/v1/integrations/${encodeURIComponent(i.id)}`,
        { method: "DELETE", credentials: "same-origin" }
      );
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error ?? `Delete failed (${res.status})`);
      toast.success("Connection deleted");
      await refresh();
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    }
  }

  const ecommerceList = useMemo(() => (integrations || []).filter((i) => i.platform || i.provider), [integrations]);

  return (
    <>
      <main className="container mx-auto py-8 px-4">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Integrations</h1>
          <p className="mt-2 text-sm text-slate-600">Connect AvidiaTech to your store and data sources.</p>
        </header>

        {/* Flex two-column layout: left main grows, right is fixed width */}
        <div className="flex gap-6">
          {/* Left: Connected integrations (flex-grow) */}
          <section className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium">Connected integrations</h2>
                <p className="text-sm text-slate-500">Active connections for this tenant</p>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => router.push("/integrations")} className="px-3 py-1 rounded border text-sm">
                  Manage integrations
                </button>
                <button onClick={() => openConnectModal("bigcommerce")} className="px-3 py-1 rounded bg-sky-600 text-white text-sm">
                  Connect BigCommerce
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-slate-500">Loading…</div>
              ) : (activeIntegrations && activeIntegrations.length > 0) ? (
                activeIntegrations.map((i) => (
                  <div key={i.id} className="flex items-center justify-between rounded border p-3 bg-white">
                    <div>
                      <div className="font-medium">{i.name ?? i.config?.store_name ?? i.config?.store_hash ?? i.provider ?? i.platform ?? i.id}</div>
                      <div className="text-xs text-slate-500">{(i.platform ?? i.provider) + (i.status ? ` • ${i.status}` : "")}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {i.platform ? (
                        <>
                          <button onClick={() => onTest(i)} className="px-3 py-1 rounded bg-emerald-600 text-white text-sm">Test connection</button>
                          <button onClick={() => onSync(i)} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Sync</button>
                          <button onClick={() => openConnectorManager(i.platform ?? i.provider)} className="px-3 py-1 rounded border text-sm">Manage</button>
                        </>
                      ) : (
                        <button onClick={() => onTest(i)} className="px-3 py-1 rounded bg-emerald-600 text-white text-sm">Test</button>
                      )}

                      <button onClick={() => onDelete(i)} className="px-3 py-1 border rounded text-sm text-rose-600 hover:bg-rose-50">Delete</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">No active integrations for this tenant.</div>
              )}
            </div>

            {error ? <div className="mt-3 text-xs text-rose-600">{String(error)}</div> : null}
          </section>

          {/* Right: Available integrations (fixed width) */}
          <aside className="w-80 flex-shrink-0">
            <div className="mb-4">
              <h3 className="text-lg font-medium">Available integrations</h3>
              <p className="text-sm text-slate-500">Select a provider to get started</p>
            </div>

            <div className="grid gap-3">
              {PROVIDERS.map((p) => (
                <div key={p.id} className="p-3 rounded-md border bg-white flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.desc}</div>
                  </div>

                  <div>
                    {p.available ? (
                      <button onClick={() => openConnectModal(p.id)} className="px-3 py-1 bg-sky-600 text-white rounded text-sm">Connect</button>
                    ) : (
                      <button disabled className="px-3 py-1 border rounded text-sm text-slate-400">Coming soon</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>

      {/* Modals / overlays rendered as siblings to main so they never affect layout */}
      <ConnectModal
        provider={connectProvider}
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onSuccess={() => refresh()}
        onOpenConnectorManager={() => openConnectorManager(connectProvider)}
        orgId={orgId ?? undefined}
      />

      {connectorManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Connector manager{connectorManagerProvider ? ` — ${connectorManagerProvider}` : ""}</h3>
              <button onClick={() => { setConnectorManagerOpen(false); setConnectorManagerProvider(null); }} className="px-2 py-1">Close</button>
            </div>

            <ConnectorManager orgId={orgId ?? ""} selectedId={""} onSelect={() => {}} initialProvider={connectorManagerProvider ?? undefined} />

            <div className="mt-4 flex justify-end">
              <button onClick={() => { setConnectorManagerOpen(false); setConnectorManagerProvider(null); refresh(); }} className="px-3 py-1 rounded bg-sky-600 text-white">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
