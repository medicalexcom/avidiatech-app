"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ConnectorManager from "@/components/integrations/ConnectorManager";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useToast } from "@/components/ui/toast";
import ConnectModal from "@/components/integrations/ConnectModal";
import ConnectorDetailsDrawer from "@/components/connectors/ConnectorDetailsDrawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * Integrations page — updated to use Actions menu per-connected-row:
 * - Actions: Test connection, Sync, Details, Delete
 * - Prefers ecommerce endpoints for ecommerce rows (platform present), falls back to legacy integrations endpoints
 * - Shows per-row loading states and toasts
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
  const { integrations, activeIntegrations, refresh, disconnect, testConnection } = useIntegrations();

  const [connectorManagerOpen, setConnectorManagerOpen] = useState(false);
  const [connectorManagerProvider, setConnectorManagerProvider] = useState<string | null>(null);

  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectProvider, setConnectProvider] = useState<string | null>(null);

  // UI action state
  const [actionMenuFor, setActionMenuFor] = useState<string | null>(null);
  const [testingFor, setTestingFor] = useState<string | null>(null);
  const [syncingFor, setSyncingFor] = useState<string | null>(null);
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<string | null>(null);
  const [detailsFor, setDetailsFor] = useState<string | null>(null);

  const ecommerceList = useMemo(() => (integrations || []).filter((i) => i.platform || i.provider), [integrations]);

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

  async function handleTest(id: string, platform?: string) {
    setTestingFor(id);
    try {
      // prefer ecommerce validate endpoint if platform present
      if (platform) {
        const res = await fetch(`/api/v1/ecommerce_connections/${encodeURIComponent(id)}/validate`, {
          credentials: "same-origin",
        });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.ok === false) {
            throw new Error(json?.error ?? json?.detail ?? "Validation failed");
          }
          toast.success("Connection validated");
          return;
        }
        // fallthrough to legacy
      }

      // fallback to integrations test
      const res2 = await fetch(`/api/v1/integrations/${encodeURIComponent(id)}/test`, {
        method: "POST",
        credentials: "same-origin",
      });
      const j2 = await res2.json().catch(() => null);
      if (!res2.ok || j2?.ok === false) throw new Error(j2?.error ?? j2?.detail ?? `Test failed (${res2.status})`);
      toast.success("Connection validated");
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    } finally {
      setTestingFor(null);
      setActionMenuFor(null);
    }
  }

  async function handleSync(id: string, platform?: string) {
    if (syncingFor === id) return;
    setSyncingFor(id);
    try {
      // Prefer ecommerce sync endpoint
      if (platform) {
        let res = await fetch(`/api/v1/ecommerce_connections/${encodeURIComponent(id)}/sync`, {
          method: "POST",
          credentials: "same-origin",
        });
        if (!res.ok) {
          // fallback to legacy integrations sync
          res = await fetch(`/api/v1/integrations/${encodeURIComponent(id)}/sync`, {
            method: "POST",
            credentials: "same-origin",
          });
        }
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error ?? `Sync failed (${res.status})`);
        const jobId = json?.jobId ?? json?.id ?? json?.pipelineRunId ?? null;
        toast.success(jobId ? `Sync queued (job ${jobId})` : "Sync started");
        // refresh list after enqueue
        refresh();
        return;
      }

      // fallback generic sync
      const res2 = await fetch(`/api/v1/integrations/${encodeURIComponent(id)}/sync`, {
        method: "POST",
        credentials: "same-origin",
      });
      const json2 = await res2.json().catch(() => null);
      if (!res2.ok || !json2?.ok) throw new Error(json2?.error ?? `Sync failed (${res2.status})`);
      const jobId2 = json2?.jobId ?? json2?.id ?? json2?.pipelineRunId ?? null;
      toast.success(jobId2 ? `Sync queued (job ${jobId2})` : "Sync started");
      refresh();
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    } finally {
      setSyncingFor(null);
      setActionMenuFor(null);
    }
  }

  async function handleDelete(id: string, platform?: string) {
    // open confirm dialog
    setConfirmDeleteFor(id);
    setActionMenuFor(null);
  }

  async function confirmDeleteNow(id: string, platform?: string) {
    try {
      // choose endpoint based on integration type
      const url = platform
        ? `/api/v1/ecommerce_connections/${encodeURIComponent(id)}`
        : `/api/v1/integrations/${encodeURIComponent(id)}`;
      const res = await fetch(url, { method: "DELETE", credentials: "same-origin" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? `Delete failed (${res.status})`);
        return;
      }
      toast.success("Connection deleted");
      refresh();
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    } finally {
      setConfirmDeleteFor(null);
      setActionMenuFor(null);
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Integrations</h1>
        <p className="mt-2 text-sm text-slate-600">Connect AvidiaTech to your store and data sources.</p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-8">
          <div className="mb-4">
            <h2 className="text-xl font-medium">Connected integrations</h2>
            <p className="text-sm text-slate-500">Active connections for this tenant</p>
          </div>

          <div className="space-y-3">
            {(activeIntegrations && activeIntegrations.length > 0) ? (
              activeIntegrations.map((i) => {
                const isTesting = testingFor === i.id;
                const isSyncing = syncingFor === i.id;
                const menuOpen = actionMenuFor === i.id;
                const platform = i.platform ?? i.provider;
                return (
                  <div key={i.id} className="p-4 rounded-md border bg-white dark:bg-slate-900 relative">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{i.name ?? i.config?.store_name ?? i.config?.store_hash ?? i.provider ?? i.platform ?? i.id}</div>
                        <div className="text-xs text-slate-500">{platform}</div>
                        <div className="text-xs text-slate-400 mt-1">Last update: {i.updated_at ?? "—"}</div>
                      </div>

                      <div className="flex items-center gap-2 relative">
                        {/* Quick Sync button */}
                        <button
                          onClick={() => handleSync(i.id, i.platform)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                          disabled={isSyncing}
                        >
                          {isSyncing ? "Syncing…" : "Sync"}
                        </button>

                        {/* Actions menu trigger */}
                        <button
                          onClick={() => setActionMenuFor(menuOpen ? null : i.id)}
                          className="px-3 py-1 rounded border text-sm hover:bg-slate-50"
                        >
                          Actions
                        </button>

                        {/* Actions dropdown */}
                        {menuOpen && (
                          <div className="absolute right-0 top-12 z-50 w-44 rounded border bg-white shadow-md p-2">
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => handleTest(i.id, i.platform)}
                                disabled={isTesting}
                                className="text-left px-2 py-1 rounded hover:bg-slate-50 text-sm"
                              >
                                {isTesting ? "Testing…" : "Test connection"}
                              </button>

                              <button
                                onClick={() => handleSync(i.id, i.platform)}
                                disabled={isSyncing}
                                className="text-left px-2 py-1 rounded hover:bg-slate-50 text-sm"
                              >
                                {isSyncing ? "Syncing…" : "Sync"}
                              </button>

                              <button
                                onClick={() => {
                                  setDetailsFor(i.id);
                                  setActionMenuFor(null);
                                }}
                                className="text-left px-2 py-1 rounded hover:bg-slate-50 text-sm"
                              >
                                Details
                              </button>

                              <button
                                onClick={() => {
                                  handleDelete(i.id, i.platform);
                                  setActionMenuFor(null);
                                }}
                                className="text-left px-2 py-1 rounded text-rose-600 hover:bg-rose-50 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 rounded-md border bg-white dark:bg-slate-900">
                <div className="text-sm text-slate-600">No active integrations. Connect a store from the catalog.</div>
              </div>
            )}
          </div>
        </section>

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

      <ConnectModal
        provider={connectProvider}
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onSuccess={() => refresh()}
        onOpenConnectorManager={() => openConnectorManagerFallback(connectProvider)}
      />

      {/* ConnectorManager fallback (rare; advanced flows) */}
      {connectorManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Connector manager{connectorManagerProvider ? ` — ${connectorManagerProvider}` : ""}</h3>
              <button onClick={() => { setConnectorManagerOpen(false); setConnectorManagerProvider(null); }} className="px-2 py-1">Close</button>
            </div>

            <ConnectorManager orgId={undefined as any} selectedId={""} onSelect={() => {}} />

            <div className="mt-4 flex justify-end">
              <button onClick={() => { setConnectorManagerOpen(false); setConnectorManagerProvider(null); refresh(); }} className="px-3 py-1 rounded bg-sky-600 text-white">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connector details drawer (opened from Actions -> Details) */}
      <ConnectorDetailsDrawer
        integrationId={detailsFor ?? ""}
        isOpen={Boolean(detailsFor)}
        onClose={() => setDetailsFor(null)}
      />

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={Boolean(confirmDeleteFor)}
        onCancel={() => setConfirmDeleteFor(null)}
        title="Delete connection"
        description={`Delete connection ${confirmDeleteFor}? This cannot be undone.`}
        onConfirm={async () => {
          if (!confirmDeleteFor) return;
          await confirmDeleteNow(confirmDeleteFor);
        }}
      />
    </div>
  );
}
