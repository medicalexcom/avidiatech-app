"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ConnectorManager from "@/components/integrations/ConnectorManager";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useToast } from "@/components/ui/toast";
import ConnectModal from "@/components/integrations/ConnectModal";
import ConnectorDetailsDrawer from "@/components/connectors/ConnectorDetailsDrawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

/**
 * Integrations page — updated:
 * - Removed the inline "Sync" quick button (keeps Sync inside Actions menu only)
 * - Adds a lightweight "Premium" gating model: Test/Sync actions require premium.
 *   - The page queries /api/v1/me for a simple plan flag (json.plan === "premium")
 *   - If not premium, Test/Sync prompt the user to upgrade (toast + Upgrade button shown)
 * - Small UI polish for cards (shadows, spacing) to feel more "premium"
 *
 * NOTE: This is a client-side gating UX. Your backend should enforce plan/permission checks for
 * real access control. Adjust the /api/v1/me shape check to match how you store plan info.
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

  // Premium gating state (fetched from /api/v1/me). Default false => show upgrade CTA.
  const [isPremium, setIsPremium] = useState(false);
  const [meLoading, setMeLoading] = useState(true);

  const ecommerceList = useMemo(() => (integrations || []).filter((i) => i.platform || i.provider), [integrations]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/v1/me", { credentials: "same-origin" });
        const json = await res.json().catch(() => null);
        if (!mounted) return;
        // Adapt this check to your backend shape. Commonly the plan could be on the org or user.
        const plan = json?.plan ?? json?.org_plan ?? json?.org?.plan ?? null;
        setIsPremium(plan === "premium" || plan === "pro");
      } catch {
        // ignore and treat as non-premium
      } finally {
        if (mounted) setMeLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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

  function promptUpgrade(actionLabel = "use this feature") {
    toast.info(`${actionLabel} requires a Premium plan — visit Billing to upgrade.`);
    // quick modal-less CTA — navigate to billing page (adjust path to match your app)
    // You may prefer a modal; keep simple and navigable
    const go = confirm("This is a Premium feature. Open Billing to upgrade?");
    if (go) {
      router.push("/settings/billing");
    }
  }

  async function handleTest(id: string, platform?: string) {
    // client-side gate
    if (!isPremium) {
      promptUpgrade("test this connection");
      return;
    }

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
    // client-side gate
    if (!isPremium) {
      promptUpgrade("queue a sync");
      return;
    }

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

  function handleDelete(id: string, platform?: string) {
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Integrations</h1>
            <p className="mt-2 text-sm text-slate-600">Connect AvidiaTech to your store and data sources.</p>
          </div>

          {/* Premium badge / CTA */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l2.9 6.2L21 9l-5 3.6L17.8 21 12 17.8 6.2 21 8 12.6 3 9l6.1-0.8L12 2z" />
              </svg>
              Premium
            </span>

            <button
              onClick={() => router.push("/settings/billing")}
              className="rounded bg-sky-600 px-3 py-1 text-white text-sm shadow-sm hover:bg-sky-700"
            >
              Upgrade / Billing
            </button>
          </div>
        </div>
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
                  <div key={i.id} className="p-4 rounded-md border bg-white dark:bg-slate-900 shadow-sm relative">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{i.name ?? i.config?.store_name ?? i.config?.store_hash ?? i.provider ?? i.platform ?? i.id}</div>
                        <div className="text-xs text-slate-500">{platform}</div>
                        <div className="text-xs text-slate-400 mt-1">Last update: {i.updated_at ?? "—"}</div>
                      </div>

                      <div className="flex items-center gap-2 relative">
                        {/* Removed the inline "Sync" button here intentionally (Sync available in Actions menu only) */}

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
                                disabled={isTesting || meLoading}
                                className={`text-left px-2 py-1 rounded hover:bg-slate-50 text-sm ${!isPremium && !meLoading ? "opacity-80" : ""}`}
                              >
                                {isTesting ? "Testing…" : "Test connection"}
                                {!isPremium && !meLoading ? " (Premium)" : ""}
                              </button>

                              <button
                                onClick={() => handleSync(i.id, i.platform)}
                                disabled={isSyncing || meLoading}
                                className={`text-left px-2 py-1 rounded hover:bg-slate-50 text-sm ${!isPremium && !meLoading ? "opacity-80" : ""}`}
                              >
                                {isSyncing ? "Syncing…" : "Sync"}
                                {!isPremium && !meLoading ? " (Premium)" : ""}
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
              <div className="p-4 rounded-md border bg-white dark:bg-slate-900 shadow-sm">
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
              <div key={p.id} className="p-3 rounded-md border bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm">
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
        // optionally pass orgId here if parent has it to avoid /api/v1/me in modal
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
