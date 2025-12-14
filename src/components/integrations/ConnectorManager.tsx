"use client";

import React, { useEffect, useState } from "react";

/**
 * Minimal ConnectorManager UI
 * - Lists connectors for current org (requires orgId passed in or derived)
 * - Allows creating a simple API-key connection (example: BigCommerce)
 *
 * NOTE: This component calls /api/v1/integrations (GET/POST) and /api/v1/integrations/:id/sync
 * Make sure server API route above is added.
 */

type Integration = {
  id: string;
  provider: string;
  name?: string;
  config?: any;
  status?: string;
};

export default function ConnectorManager({ orgId }: { orgId: string }) {
  const [list, setList] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [storeHash, setStoreHash] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/integrations?orgId=${encodeURIComponent(orgId)}`);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setList(json.integrations ?? []);
      } else {
        setError(json?.error ?? "Failed to load");
      }
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orgId) fetchList();
  }, [orgId]);

  async function createBigCommerce() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/integrations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          provider: "bigcommerce",
          name: name || "BigCommerce",
          config: { store_hash: storeHash },
          secrets: { access_token: accessToken },
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Create failed");
        return;
      }
      await fetchList();
      setName("");
      setStoreHash("");
      setAccessToken("");
    } catch (err: any) {
      setError(String(err?.message ?? err));
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
        return;
      }
      // optionally notify / refresh
      alert(`Sync started: ${json.jobId}`);
    } catch (err: any) {
      setError(String(err?.message ?? err));
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold">Connectors</h3>

      <div className="mt-3 space-y-2">
        {loading ? (
          <div>Loading…</div>
        ) : (
          list.map((i) => (
            <div key={i.id} className="rounded border p-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{i.name ?? i.provider}</div>
                <div className="text-xs text-slate-500">{i.provider} • {i.status ?? "ready"}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => triggerSync(i.id)} className="px-2 py-1 rounded bg-sky-500 text-white text-xs">Sync now</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 rounded border p-3">
        <div className="text-xs text-slate-500 mb-2">Add BigCommerce (example)</div>
        {error && <div className="text-xs text-rose-600 mb-2">{error}</div>}
        <input placeholder="Connection name" value={name} onChange={(e)=>setName(e.target.value)} className="w-full mb-2 px-2 py-1 border rounded" />
        <input placeholder="Store hash" value={storeHash} onChange={(e)=>setStoreHash(e.target.value)} className="w-full mb-2 px-2 py-1 border rounded" />
        <input placeholder="Access token" value={accessToken} onChange={(e)=>setAccessToken(e.target.value)} className="w-full mb-2 px-2 py-1 border rounded" />
        <div className="flex gap-2">
          <button onClick={createBigCommerce} disabled={creating} className="px-3 py-1 bg-emerald-500 text-white rounded text-sm">
            {creating ? "Creating…" : "Create BigCommerce"}
          </button>
          <button onClick={fetchList} className="px-3 py-1 bg-slate-50 border rounded text-sm">Refresh</button>
        </div>
      </div>
    </div>
  );
}
