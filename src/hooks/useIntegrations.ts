"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * useIntegrations
 * - Fetches both /api/v1/integrations and /api/v1/ecommerce_connections (fallback)
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
  // whether the row stores secrets (useful to decide which endpoint to call)
  hasSecrets?: boolean;
};

function normalizeIntegrationsFromApi(payload: any): Integration[] {
  if (!payload) return [];
  // payload can be { ok: true, integrations: [...] } or array or { data: [...] }
  let list: any[] = [];
  if (Array.isArray(payload)) list = payload;
  else if (Array.isArray(payload?.integrations)) list = payload.integrations;
  else if (Array.isArray(payload?.data)) list = payload.data;
  else if (Array.isArray(payload?.connections)) list = payload.connections;
  else if (Array.isArray(payload?.results)) list = payload.results;
  else list = [];

  return list.map((r) => ({
    id: String(r.id),
    provider: r.provider ?? null,
    platform: r.platform ?? null,
    name: r.name ?? r.display_name ?? r.store_name ?? null,
    status: r.status ?? null,
    config: r.config ?? null,
    updated_at: r.updated_at ?? r.last_synced_at ?? r.updatedAt ?? null,
    hasSecrets: Boolean(r.encrypted_secrets ?? r.secrets_enc ?? r.secrets ?? r.encrypted_secret),
  }));
}

export function useIntegrations() {
  const router = useRouter();

  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try primary endpoint first
      const res = await fetch("/api/v1/integrations", { credentials: "same-origin" });
      let json: any = null;
      try {
        json = await res.json();
      } catch {}
      let list: Integration[] = [];
      if (res.ok) {
        list = normalizeIntegrationsFromApi(json);
      } else {
        // fallback to ecommerce_connections endpoint (session-based)
        const res2 = await fetch("/api/v1/ecommerce_connections", { credentials: "same-origin" });
        let json2: any = null;
        try {
          json2 = await res2.json();
        } catch {}
        if (res2.ok) {
          list = normalizeIntegrationsFromApi(json2);
        } else {
          // neither endpoint returned ok; treat as empty and surface an error
          setError(`Failed to load integrations (status ${res.status || res2.status})`);
          list = [];
        }
      }

      setIntegrations(list);
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

  const refresh = useCallback(() => {
    fetchAll();
  }, [fetchAll]);

  const connect = useCallback((provider: string) => {
    // navigate to integrations page to start the provider-specific flow
    router.push(`/integrations?connect=${encodeURIComponent(provider)}`);
  }, [router]);

  const disconnect = useCallback(
    async (id: string, platform?: string) => {
      // If platform looks like an ecommerce platform, call ecommerce_connections, otherwise integrations
      const isEcom = Boolean(platform);
      const url = isEcom ? `/api/v1/ecommerce_connections/${encodeURIComponent(id)}` : `/api/v1/integrations/${encodeURIComponent(id)}`;

      const res = await fetch(url, { method: "DELETE", credentials: "same-origin" });
      if (!res.ok) {
        let body: any = null;
        try {
          body = await res.json();
        } catch {}
        throw new Error(body?.error ?? body?.message ?? `Delete failed (${res.status})`);
      }
      await fetchAll();
      return true;
    },
    [fetchAll]
  );

  const testConnection = useCallback(
    async (idOrObj: string | { id: string; provider?: string; platform?: string }) => {
      // Accept either an integration id string or an integration object
      let id: string;
      let provider: string | undefined;
      let platform: string | undefined;
      if (typeof idOrObj === "string") {
        id = idOrObj;
      } else {
        id = idOrObj.id;
        provider = idOrObj.provider;
        platform = idOrObj.platform;
      }

      // Prefer ecommerce validation endpoint if platform suggests ecommerce
      if (platform || provider === "bigcommerce") {
        // try ecommerce validate (if exists)
        const url = `/api/v1/ecommerce_connections/${encodeURIComponent(id)}/validate`;
        const res = await fetch(url, { credentials: "same-origin" });
        if (res.ok) {
          try {
            const json = await res.json();
            return json;
          } catch {
            return { ok: true };
          }
        }
        // fall through to generic test route
      }

      // Generic test for integrations
      const testUrl = `/api/v1/integrations/${encodeURIComponent(id)}/test`;
      const res2 = await fetch(testUrl, { method: "POST", credentials: "same-origin" });
      if (!res2.ok) {
        let body: any = null;
        try {
          body = await res2.json();
        } catch {}
        throw new Error(body?.error ?? body?.message ?? `Test failed (${res2.status})`);
      }
      const json2 = await res2.json().catch(() => null);
      return json2 ?? { ok: true };
    },
    []
  );

  const activeIntegrations = useMemo(() => {
    if (!integrations) return [];
    return integrations.filter((i) => (i.status ?? "").toLowerCase().includes("active") || (i.status ?? "").toLowerCase().includes("ready") || (i.status ?? "").toLowerCase().includes("connected"));
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
