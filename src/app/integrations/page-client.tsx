"use client";

import React, { useMemo, useState, useCallback } from "react";
import ConnectorManager from "@/components/integrations/ConnectorManager";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useToast } from "@/components/ui/toast";
import ConnectModal from "@/components/integrations/ConnectModal";
import ConnectorDetailsDrawer from "@/components/connectors/ConnectorDetailsDrawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * Integrations page — refined UI and correct Actions wiring
 * - Ensures Sync calls include org_id/tenantId where required (legacy endpoints require org_id)
 * - Caches resolved org_id from /api/v1/me to avoid repeated calls
 * - Removed quick Connect button, improved card styling and Actions dropdown
 */

const PROVIDERS = [
  { id: "bigcommerce", name: "BigCommerce", desc: "Full-featured storefront", available: true },
  { id: "shopify", name: "Shopify", desc: "Shopify stores", available: true },
  { id: "woocommerce", name: "WooCommerce", desc: "WordPress commerce", available: true },
  { id: "magento", name: "Magento", desc: "Enterprise stores", available: false },
  { id: "squarespace", name: "Squarespace", desc: "Squarespace commerce", available: false },
];

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function IntegrationsPage() {
  const toast = useToast();
  const { integrations, activeIntegrations, refresh } = useIntegrations();

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

  // cached org id (resolved once)
  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(null);

  // resolve org id (cached)
  const resolveOrgId = useCallback(async (): Promise<string | null> => {
    if (resolvedOrgId) return resolvedOrgId;
    try {
      const res = await fetch("/api/v1/me", { credentials: "same-origin" });
      if (!res.ok) return null;
      const json = await res.json().catch(() => null);
      const org = json?.org_id ?? null;
      if (org) setResolvedOrgId(org);
      return org;
    } catch {
      return null;
    }
  }, [resolvedOrgId]);

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
      // Prefer ecommerce validate endpoint for ecommerce rows
      if (platform) {
        const res = await fetch(`/api/v1/ecommerce_connections/${encodeURIComponent(id)}/validate`, {
          credentials: "same-origin",
        });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.ok === false) throw new Error(json?.error ?? json?.detail ?? "Validation failed");
          toast.success("Connection validated");
          refresh();
          return;
        }
        // fallthrough to legacy
      }

      // Fallback to legacy integrations test
      const org = await resolveOrgId();
      const body = org ? JSON.stringify({ org_id: org }) : undefined;
      const res2 = await fetch(`/api/v1/integrations/${encodeURIComponent(id)}/test`, {
        method: "POST",
        credentials: "same-origin",
        headers: body ? { "content-type": "application/json" } : undefined,
        body,
      });
      const j2 = await res2.json().catch(() => null);
      if (!res2.ok || j2?.ok === false) throw new Error(j2?.error ?? j2?.detail ?? `Test failed (${res2.status})`);
      toast.success("Connection validated");
      refresh();
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
      const org = await resolveOrgId();

      // Prefer ecommerce sync endpoint for ecommerce connections
      if (platform) {
        // include tenantId query param when available (some handlers expect it)
        const ecoUrl = org
          ? `/api/v1/ecommerce_connections/${encodeURIComponent(id)}/sync?tenantId=${encodeURIComponent(org)}`
          : `/api/v1/ecommerce_connections/${encodeURIComponent(id)}/sync`;

        let res = await fetch(ecoUrl, {
          method: "POST",
          credentials: "same-origin",
        });

        if (!res.ok) {
          // fallback to legacy integrations sync - include org_id in body if known (legacy requires org_id)
          const legacyBody = org ? JSON.stringify({ org_id: org }) : undefined;
          res = await fetch(`/api/v1/integrations/${encodeURIComponent(id)}/sync`, {
            method: "POST",
            credentials: "same-origin",
            headers: legacyBody ? { "content-type": "application/json" } : undefined,
            body: legacyBody,
          });
        }

        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error ?? `Sync failed (${res.status})`);
        const jobId = json?.jobId ?? json?.id ?? json?.pipelineRunId ?? null;
        toast.success(jobId ? `Sync queued (job ${jobId})` : "Sync started");
        refresh();
        return;
      }

      // No platform (legacy integration) - send org_id in body if available (legacy endpoint expects it)
      const body = org ? JSON.stringify({ org_id: org }) : undefined;
      const res2 = await fetch(`/api/v1/integrations/${encodeURIComponent(id)}/sync`, {
        method: "POST",
        credentials: "same-origin",
        headers: body ? { "content-type": "application/json" } : undefined,
        body,
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

  function promptDelete(id: string) {
    setConfirmDeleteFor(id);
    setActionMenuFor(null);
  }

  async function confirmDeleteNow(id: string) {
    try {
      // Try ecommerce delete first (most common), then fallback to integrations delete
      const res = await fetch(`/api/v1/ecommerce_connections/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) {
        toast.success("Connection deleted");
        refresh();
        return;
      }

      // fallback
      const res2 = await fetch(`/api/v1/integrations/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const j2 = await res2.json().catch(() => null);
      if (!res2.ok || !j2?.ok) {
        toast.error(j2?.error ?? j?.error ?? `Delete failed (${res2.status})`);
        return;
      }
      toast.success("Connection deleted");
      refresh();
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    } finally {
      setConfirmDeleteFor(null);
    }
  }

  return (
    <div className="dark relative min-h-screen bg-slate-950 text-slate-50 overflow-hidden">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/8 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-[300px] w-[300px] rounded-full bg-emerald-500/8 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle,rgba(148,163,184,0.5) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg,#06b6d4 0%,#10b981 100%)" }} />
      <div className="relative container mx-auto py-8 px-4">
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

                const status = (i.status ?? "unknown").toLowerCase();
                const active = status.includes("active") || status.includes("ready") || status.includes("connected");

                return (
                  <div
                    key={i.id}
                    className="p-4 rounded-lg border bg-white shadow-sm hover:shadow-md transition relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-baseline gap-3">
                              <div className="font-medium truncate text-lg">
                                {i.name ?? i.config?.store_name ?? i.config?.store_hash ?? i.provider ?? i.platform ?? i.id}
                              </div>
                              <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                                {active ? "Active" : (i.status ?? "Unknown")}
                              </div>
                            </div>
                            <div className="text-xs text-slate-500 truncate mt-1">{platform}</div>
                          </div>
                        </div>

                        <div className="text-xs text-slate-400 mt-2">Last update: {formatDate(i.updated_at)}</div>
                      </div>

                      <div className="flex items-center gap-2 relative">
                        {/* Actions menu trigger only (no quick Sync button) */}
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
                                  promptDelete(i.id);
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
              <div className="p-6 text-center rounded-lg border bg-white shadow-sm">
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
                    <button onClick={() => openConnect(p.id)} className="px-3 py-1 bg-sky-600 text-white rounded text-sm shadow-sm hover:bg-sky-700">
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
    </div>
  );
}
