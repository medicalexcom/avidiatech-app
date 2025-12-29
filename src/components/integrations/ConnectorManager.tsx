"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";

/**
 * ConnectorManager (multi-provider)
 * - Supports: bigcommerce (API token + store_hash), wooCommerce (consumer key/secret),
 *   shopify (OAuth flow trigger), magento (API token), generic-api-key.
 *
 * - Expects server endpoints:
 *   GET  /api/v1/integrations?orgId=<org>
 *   POST /api/v1/integrations
 *   POST /api/v1/integrations/:id/sync
 *   GET  /api/v1/integrations/oauth/shopify/start  (server will redirect to Shopify)
 *
 * Replace orgId usage with a session-derived orgId once you add server auth integration.
 */

type Integration = {
  id: string;
  provider: string;
  name?: string;
  config?: any;
  status?: string;
  last_synced_at?: string | null;
  last_error?: string | null;
};

type Props = {
  orgId: string;
  selectedId?: string;
  onSelect?: (id: string) => void;
};

export default function ConnectorManager({ orgId, selectedId, onSelect }: Props) {
  const [list, setList] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [provider, setProvider] = useState<string>("bigcommerce");
  const [name, setName] = useState("");
  // BigCommerce
  const [storeHash, setStoreHash] = useState("");
  const [accessToken, setAccessToken] = useState("");
  // WooCommerce
  const [wcKey, setWcKey] = useState("");
  const [wcSecret, setWcSecret] = useState("");
  // Magento / generic
  const [apiToken, setApiToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  const toast = useToast();

  async function fetchList() {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/integrations?orgId=${encodeURIComponent(orgId)}`);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setList(json.integrations ?? []);
      } else {
        setError(json?.error ?? "Failed to load");
        toast.error(json?.error ?? "Failed to load connectors");
      }
    } catch (err: any) {
      setError(String(err?.message ?? err));
      toast.error(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orgId) fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function createConnector() {
    setCreating(true);
    setError(null);
    try {
      let payload: any = { org_id: orgId, provider, name: name || provider, config: {}, secrets: {} };

      if (provider === "bigcommerce") {
        payload.config = { store_hash: storeHash };
        payload.secrets = { access_token: accessToken };
      } else if (provider === "woocommerce") {
        payload.config = {};
        payload.secrets = { consumer_key: wcKey, consumer_secret: wcSecret };
      } else if (provider === "magento") {
        payload.config = {};
        payload.secrets = { api_token: apiToken };
      } else if (provider === "generic-api-key") {
        payload.config = {};
        payload.secrets = { api_key: apiToken };
      } else if (provider === "shopify") {
        // start OAuth flow
        const startUrl = `/api/v1/integrations/oauth/shopify/start?orgId=${encodeURIComponent(orgId)}`;
        try {
          const res = await fetch(startUrl);
          const json = await res.json().catch(() => null);
          if (json?.redirectUrl) {
            window.location.href = json.redirectUrl;
          } else {
            window.location.href = startUrl;
          }
        } finally {
          setCreating(false);
        }
        return;
      }

      const res = await fetch("/api/v1/integrations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Create failed");
        toast.error(json?.error ?? "Create failed");
        return;
      }
      toast.success("Connector created");
      await fetchList();
      setName("");
      setStoreHash("");
      setAccessToken("");
      setWcKey("");
      setWcSecret("");
      setApiToken("");
    } catch (err: any) {
      setError(String(err?.message ?? err));
      toast.error(String(err?.message ?? err));
    } finally {
      setCreating(false);
    }
  }

  async function triggerSync(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/v1/integrations/${id}/sync`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ org_id: orgId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Sync failed");
        toast.error(json?.error ?? "Sync failed");
        return;
      }
      toast.success(`Sync started: ${json.jobId ?? json.id ?? "queued"}`);
      // Optionally refresh list to reflect new sync timestamps
      await fetchList();
    } catch (err: any) {
      setError(String(err?.message ?? err));
      toast.error(String(err?.message ?? err));
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold">Connectors</h3>

      <div className="mt-3 space-y-2">
        {loading ? (
          <div>Loading…</div>
        ) : (
          list.map((i) => {
            const isSelected = selectedId && selectedId === i.id;
            return (
              <div
                key={i.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect?.(i.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect?.(i.id);
                  }
                }}
                className={`rounded border p-2 flex items-center justify-between cursor-pointer ${
                  isSelected ? "ring-2 ring-sky-300 bg-sky-50" : "hover:bg-slate-50"
                }`}
              >
                <div>
                  <div className="font-medium">{i.name ?? i.provider}</div>
                  <div className="text-xs text-slate-500">
                    {i.provider} • {i.status ?? "ready"}
                    {i.last_synced_at ? ` • last: ${new Date(i.last_synced_at).toLocaleString()}` : ""}
                  </div>
                  {i.last_error && <div className="text-xs text-rose-600 mt-1">Last error: {String(i.last_error)}</div>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      triggerSync(i.id);
                    }}
                    className="px-2 py-1 rounded bg-sky-500 text-white text-xs"
                  >
                    Sync now
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 rounded border p-3">
        <div className="text-xs text-slate-500 mb-2">Create connector</div>
        {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}

        <div className="mb-2">
          <label className="text-xs">Provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full rounded border px-2 py-1">
            <option value="bigcommerce">BigCommerce (API token)</option>
            <option value="shopify">Shopify (OAuth)</option>
            <option value="woocommerce">WooCommerce (consumer key/secret)</option>
            <option value="magento">Magento (API token)</option>
            <option value="generic-api-key">Generic API Key</option>
          </select>
        </div>

        <input placeholder="Connection name" value={name} onChange={(e) => setName(e.target.value)} className="w-full mb-2 px-2 py-1 border rounded" />

        {provider === "bigcommerce" && (
          <>
            <input placeholder="Store hash" value={storeHash} onChange={(e) => setStoreHash(e.target.value)} className="w-full mb-2 px-2 py-1 border rounded" />
            <input placeholder="Access token" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className="w-full mb-2 px-2 py-1 border rounded" />
          </>
        )}

        {provider === "woocommerce" && (
          <>
            <input placeholder="Consumer Key" value={wcKey} onChange={(e) => setWcKey(e.target.value)} className="w-full mb-2 px-2 py-1 border rounded" />
            <input placeholder="Consumer Secret" value={wcSecret} onChange={(e) => setWcSecret(e.target.value)} className="w-full mb-2 px-2 py-1 border rounded" />
          </>
        )}

        {(provider === "magento" || provider === "generic-api-key") && (
          <input placeholder="API token / key" value={apiToken} onChange={(e) => setApiToken(e.target.value)} className="w-full mb-2 px-2 py-1 border rounded" />
        )}

        <div className="flex gap-2">
          <button onClick={createConnector} disabled={creating} className="px-3 py-1 bg-emerald-500 text-white rounded text-sm">
            {creating ? "Creating…" : provider === "shopify" ? "Start Shopify auth" : "Create connector"}
          </button>
          <button onClick={fetchList} className="px-3 py-1 bg-slate-50 border rounded text-sm">Refresh</button>
        </div>
      </div>
    </div>
  );
}
