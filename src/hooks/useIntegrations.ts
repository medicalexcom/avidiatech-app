"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * useIntegrations (tenant-aware)
 * - fetches /api/v1/me for org_id, then queries integrations and ecommerce_connections using that id
 * - normalizes results for UI
 */

export type Integration = {
  id: string;
  provider?: string | null;
  platform?: string | null;
  name?: string | null;
  status?: string | null;
  config?: Record<string, any> | null;
  updated_at?: string | null;
  __source?: "integrations" | "ecommerce";
};

function normalizeList(payload: any, source: "integrations" | "ecommerce") {
  if (!payload) return [];
  let list: any[] = [];

  if (Array.isArray(payload)) list = payload;
  else if (Array.isArray(payload?.integrations)) list = payload.integrations;
  else if (Array.isArray(payload?.connections)) list = payload.connections;
  else if (Array.isArray(payload?.data)) list = payload.data;
  else list = [];

  return list.map((r) => ({
    id: String(r.id),
    provider: r.provider ?? null,
    platform: r.platform ?? null,
    name: r.name ?? r.display_name ?? r.store_name ?? r.config?.store_name ?? r.config?.store_hash ?? r.id,
    status: r.status ?? null,
    config: r.config ?? null,
    updated_at: r.updated_at ?? r.last_synced_at ?? r.updatedAt ?? null,
    __source: source,
  }));
}

export function useIntegrations() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  const fetchOrg = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/me", { credentials: "same-origin" });
      if (!res.ok) return null;
      const json = await res.json().catch(() => null);
      return json?.org_id ?? null;
    } catch {
      return null;
    }
  }, []);

  const fetchAll = useCallback(
    async (forceOrgId?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const resolvedOrg = forceOrgId ?? (orgId ?? (await fetchOrg()));
        if (!resolvedOrg) {
          // try fetching generic endpoints without orgId (best-effort)
          const [r1, r2] = await Promise.allSettled([
            fetch("/api/v1/integrations", { credentials: "same-origin" }),
            fetch("/api/v1/ecommerce_connections", { credentials: "same-origin" }),
          ]);
          let list: Integration[] = [];
          if (r1.status === "fulfilled") {
            const res = r1.value;
            const json = await res.json().catch(() => null);
            if (res.ok) list = list.concat(normalizeList(json, "integrations"));
          }
          if (r2.status === "fulfilled") {
            const res2 = r2.value;
            const json2 = await res2.json().catch(() => null);
            if (res2.ok) list = list.concat(normalizeList(json2, "ecommerce"));
          }
          setIntegrations(list);
          setLoading(false);
          return;
        }

        // we have an org/tenant id: query tenant-aware endpoints
        setOrgId(resolvedOrg);

        const urls = [
          `/api/v1/integrations?orgId=${encodeURIComponent(resolvedOrg)}`,
          `/api/v1/ecommerce_connections?tenantId=${encodeURIComponent(resolvedOrg)}`,
        ];

        const [r1, r2] = await Promise.allSettled(urls.map((u) => fetch(u, { credentials: "same-origin" })));

        let list: Integration[] = [];

        if (r1.status === "fulfilled") {
          const res = r1.value;
          const json = await res.json().catch(() => null);
          if (res.ok) list = list.concat(normalizeList(json, "integrations"));
        }
        if (r2.status === "fulfilled") {
          const res2 = r2.value;
          const json2 = await res2.json().catch(() => null);
          if (res2.ok) list = list.concat(normalizeList(json2, "ecommerce"));
        }

        // dedupe by id (prefer 'integrations' source)
        const byId = new Map<string, Integration>();
        for (const it of list) {
          if (!byId.has(it.id)) byId.set(it.id, it);
          else {
            const cur = byId.get(it.id)!;
            byId.set(it.id, Object.assign({}, cur, Object.fromEntries(Object.entries(it).filter(([k, v]) => v != null))));
          }
        }

        setIntegrations(Array.from(byId.values()));
      } catch (err: any) {
        console.error("useIntegrations.fetchAll error", err);
        setError(String(err?.message ?? err));
        setIntegrations([]);
      } finally {
        setLoading(false);
      }
    },
    [fetchOrg, orgId]
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refresh = useCallback(() => fetchAll(null), [fetchAll]);

  const connect = useCallback((provider: string) => {
    router.push(`/integrations?connect=${encodeURIComponent(provider)}`);
  }, [router]);

  const disconnect = useCallback(
    async (id: string, platform?: string) => {
      const url = platform ? `/api/v1/ecommerce_connections/${encodeURIComponent(id)}` : `/api/v1/integrations/${encodeURIComponent(id)}`;
      const res = await fetch(url, { method: "DELETE", credentials: "same-origin" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? body?.message ?? `Delete failed (${res.status})`);
      }
      await fetchAll(null);
      return true;
    },
    [fetchAll]
  );

  const testConnection = useCallback(
    async (idOrObj: string | { id: string; provider?: string; platform?: string }) => {
      let id: string;
      let provider: string | undefined;
      let platform: string | undefined;
      if (typeof idOrObj === "string") id = idOrObj;
      else {
        id = idOrObj.id;
        provider = idOrObj.provider;
        platform = idOrObj.platform;
      }

      if (platform || provider === "bigcommerce") {
        const url = `/api/v1/ecommerce_connections/${encodeURIComponent(id)}/validate`;
        const res = await fetch(url, { credentials: "same-origin" });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          return json ?? { ok: true };
        }
      }

      const testUrl = `/api/v1/integrations/${encodeURIComponent(id)}/test`;
      const res2 = await fetch(testUrl, { method: "POST", credentials: "same-origin" });
      if (!res2.ok) {
        const body = await res2.json().catch(() => null);
        throw new Error(body?.error ?? body?.message ?? `Test failed (${res2.status})`);
      }
      const json2 = await res2.json().catch(() => null);
      return json2 ?? { ok: true };
    },
    []
  );

  const activeIntegrations = useMemo(() => {
    if (!integrations) return [];
    return integrations.filter((i) => {
      const s = (i.status ?? "").toLowerCase();
      return s.includes("active") || s.includes("ready") || s.includes("connected");
    });
  }, [integrations]);

  return {
    integrations,
    activeIntegrations,
    loading,
    error,
    orgId,
    refresh,
    connect,
    disconnect,
    testConnection,
  };
}
