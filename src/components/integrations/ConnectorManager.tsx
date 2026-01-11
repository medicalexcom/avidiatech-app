"use client";

import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";

/**
 * ConnectorManager (multi-provider)
 * - Now unified to use /api/v1/ecommerce_connections for ecommerce provider create/list.
 *
 * - Expects server endpoints:
 *   GET  /api/v1/ecommerce_connections?tenantId=<org>
 *   POST /api/v1/ecommerce_connections?tenantId=<org>
 *   DELETE /api/v1/ecommerce_connections/:id
 *   (falls back to /api/v1/integrations endpoints for compatibility)
 *
 * Replace orgId usage with a session-derived orgId once you add server auth integration.
 */

type Integration = {
  id: string;
  provider?: string;
  platform?: string;
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
  // optional initial provider to pre-select when opening the manager (added to support pre-fill flows)
  initialProvider?: string;
};

export default function ConnectorManager({ orgId, selectedId, onSelect, initialProvider }: Props) {
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

  // apply initialProvider when provided (pre-select provider in UI)
  useEffect(() => {
    if (initialProvider) {
      setProvider(initialProvider);
    }
  }, [initialProvider]);

  async function fetchList() {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      // Try canonical ecommerce_connections first (tenant-aware)
      const res = await fetch(`/api/v1/ecommerce_connections?tenantId=${encodeURIComponent(orgId)}`, {
        credentials: "same-origin",
      });
      let json = await res.json().catch(() => null);
      let rows: any[] = [];

      if (res.ok && Array.isArray(json?.connections)) {
        rows = json.connections;
      } else {
        // fallback to legacy integrations endpoint for compatibility
        const res2 = await fetch(`/api/v1/integrations?orgId=${encodeURIComponent(orgId)}`, { credentials: "same-origin" });
        const json2 = await res2.json().catch(() => null);
        if (res2.ok && Array.isArray(json2?.integrations)) {
          rows = json2.integrations;
        } else if (res2.ok && Array.isArray(json2)) {
          rows = json2;
        }
      }

      // normalize rows to Integration[]
      const normalized = (rows ?? []).map((r: any) => {
        return {
          id: String(r.id),
          provider: r.provider ?? r.platform ?? r.provider,
          platform: r.platform ?? r.provider ?? undefined,
          name: r.name ?? r.config?.store_name ?? r.name ?? r.config?.store_hash ?? r.id,
          config: r.config ?? {},
          status: r.status ?? "active",
          last_synced_at: r.updated_at ?? r.last_synced_at ?? null,
        } as Integration;
      });

      setList(normalized);
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
      // Build payload for canonical endpoint
      let payload: any = { provider };

      if (provider === "bigcommerce") {
        payload.storeHash = storeHash;
        payload.accessToken = accessToken;
        if (name) payload.name = name;
      } else if (provider === "woocommerce") {
        payload.config = {};
        payload.secrets = { consumer_key: wcKey, consumer_secret: wcSecret };
        if (name) payload.name = name;
      } else if (provider === "magento") {
        payload.config = {};
        payload.secrets = { api_token: apiToken };
        if (name) payload.name = name;
      } else if (provider === "shopify") {
        // Shopify: start OAuth flow on the server (legacy flow)
        const oauthRes = await fetch(`/api/v1/integrations/oauth/shopify/start`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ org_id: orgId }),
        });
        if (!oauthRes.ok) {
          const j = await oauthRes.json().catch(() => null);
          throw new Error(j?.error ?? `Shopify start failed (${oauthRes.status})`);
        }
        const j = await oauthRes.json().catch(() => null);
        if (j?.redirect) {
          window.location.href = j.redirect;
          return;
        }
      } else {
        // generic fallback
        payload.config = {};
        payload.secrets = { api_token: apiToken };
        if (name) payload.name = name;
      }

      // For non-OAuth providers, POST to canonical ecommerce endpoint
      if (provider !== "shopify") {
        // include tenant info as query param so server can resolve tenant without session
        const res = await fetch(`/api/v1/ecommerce_connections?tenantId=${encodeURIComponent(orgId)}`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error ?? `Create failed (${res.status})`);
        }
        toast.success("Connector created");
      }

      // refresh list
      await fetchList();
      setCreating(false);
    } catch (err: any) {
      setError(String(err?.message ?? err));
      toast.error(String(err?.message ?? err));
      setCreating(false);
    }
  }

  async function syncConnector(id: string) {
    try {
      // prefer ecommerce_connections sync route if present, else fallback to legacy integrations/:id/sync
      let res = await fetch(`/api/v1/ecommerce_connections/${encodeURIComponent(id)}/sync`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        // fallback
        res = await fetch(`/api/v1/integrations/${encodeURIComponent(id)}/sync`, {
          method: "POST",
          credentials: "same-origin",
        });
      }
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? `Sync failed (${res.status})`);
      toast.success("Sync started");
      await fetchList();
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className="rounded border px-2 py-1 text-sm">
            <option value="bigcommerce">BigCommerce</option>
            <option value="shopify">Shopify</option>
            <option value="woocommerce">WooCommerce</option>
            <option value="magento">Magento</option>
            <option value="generic">API key</option>
          </select>
          <input placeholder="Connector name (optional)" className="rounded border px-2 py-1 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <button onClick={createConnector} className="rounded bg-sky-600 px-3 py-1 text-white text-sm" disabled={creating}>
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
      </div>

      {/* provider-specific fields */}
      {provider === "bigcommerce" && (
        <div className="mb-3 grid gap-2">
          <input placeholder="store hash" value={storeHash} onChange={(e) => setStoreHash(e.target.value)} className="rounded border px-2 py-1 text-sm" />
          <input placeholder="access token" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className="rounded border px-2 py-1 text-sm" />
        </div>
      )}

      {provider === "woocommerce" && (
        <div className="mb-3 grid gap-2">
          <input placeholder="consumer key" value={wcKey} onChange={(e) => setWcKey(e.target.value)} className="rounded border px-2 py-1 text-sm" />
          <input placeholder="consumer secret" value={wcSecret} onChange={(e) => setWcSecret(e.target.value)} className="rounded border px-2 py-1 text-sm" />
        </div>
      )}

      {provider === "magento" && (
        <div className="mb-3">
          <input placeholder="API token" value={apiToken} onChange={(e) => setApiToken(e.target.value)} className="rounded border px-2 py-1 text-sm" />
        </div>
      )}

      {error ? <div className="text-xs text-rose-600 mb-3">{error}</div> : null}

      <div className="mt-4">
        <div className="mb-2 text-sm font-medium">Existing connectors</div>
        <div className="space-y-2">
          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : list.length ? (
            list.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded border p-2">
                <div>
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-slate-500">{l.platform ?? l.provider} • {l.status}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => syncConnector(l.id)} className="px-2 py-1 border rounded text-sm">Sync</button>
                  <button onClick={() => onSelect?.(l.id)} className="px-2 py-1 rounded bg-slate-100 text-sm">Select</button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500">No connectors</div>
          )}
        </div>
      </div>
    </div>
  );
}
