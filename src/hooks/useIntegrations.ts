"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * useIntegrations
 * - Fetches both /api/v1/integrations and /api/v1/ecommerce_connections in parallel
 * - Normalizes to a single Integration[] shape for UI usage.
 * - Exposes connect (navigate), disconnect, testConnection, refresh.
 */

export type Integration = {
  id: string;
  provider?: string | null;
  platform?: string | null;
  name?: string | null;
  status?: string | null;
  config?: Record<string, any> | null;
  updated_at?: string | null;
  hasSecrets?: boolean;
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
    hasSecrets: Boolean(r.encrypted_secrets ?? r.secrets_enc ?? r.secrets ?? r.encrypted_secret),
    __source: source,
  }));
}

export function useIntegrations() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // fetch both in parallel
      const [r1, r2] = await Promise.allSettled([
        fetch("/api/v1/integrations", { credentials: "same-origin" }),
        fetch("/api/v1/ecommerce_connections", { credentials: "same-origin" }),
      ]);

      let list: Integration[] = [];

      // primary endpoint
      if (r1.status === "fulfilled") {
        try {
          const res = r1.value;
          const json = await res.json().catch(() => null);
          if (res.ok) {
            list = list.concat(normalizeList(json, "integrations"));
          } else {
            // non-ok — treat as empty but keep going
          }
        } catch (e) {
          // ignore parse errors
        }
      }

      // ecommerce fallback
      if (r2.status === "fulfilled") {
        try {
          const res2 = r2.value;
          const json2 = await res2.json().catch(() => null);
          if (res2.ok) {
            list = list.concat(normalizeList(json2, "ecommerce"));
          }
        } catch (e) {
          // ignore
        }
      }

      // deduplicate by id (prefer integrations source over ecommerce if duplicates)
      const byId = new Map<string, Integration>();
      for (const item of list) {
        if (!byId.has(item.id)) byId.set(item.id, item);
        else {
          // merge preferring non-null fields
          const cur = byId.get(item.id)!;
          byId.set(
            item.id,
            Object.assign({}, cur, Object.fromEntries(Object.entries(item).filter(([k, v]) => v !== null && v !== undefined)))
          );
        }
      }

      const merged = Array.from(byId.values());
      setIntegrations(merged);
    } catch (err: any) {
      console.error("useIntegrations.fetchAll error", err);
      setError(String(err?.message ?? err));
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refresh = useCallback(() => fetchAll(), [fetchAll]);

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
      await fetchAll();
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

      // try ecommerce validate first if suitable
      if (platform || provider === "bigcommerce") {
        const url = `/api/v1/ecommerce_connections/${encodeURIComponent(id)}/validate`;
        const res = await fetch(url, { credentials: "same-origin" });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          return json ?? { ok: true };
        }
        // else fallthrough
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
    refresh,
    connect,
    disconnect,
    testConnection,
  };
}
