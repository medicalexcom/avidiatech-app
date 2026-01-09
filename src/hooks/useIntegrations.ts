// client-side hook to fetch integrations and provide actions.
// Uses simple fetch + state for compatibility (no external deps).
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type Integration = {
  id: string;
  provider?: string;
  platform?: string;
  name?: string;
  status?: string;
  config?: Record<string, any>;
  updated_at?: string | null;
};

export function useIntegrations() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Primary source: /api/v1/integrations
      const res = await fetch("/api/v1/integrations", { credentials: "same-origin" });
      if (res.ok) {
        const json = await res.json();
        // assume the API returns { ok: true, integrations: [...] } or an array
        let list: Integration[] = [];
        if (Array.isArray(json)) list = json;
        else if (Array.isArray(json?.integrations)) list = json.integrations;
        else if (Array.isArray(json?.data)) list = json.data;
        setIntegrations(list);
      } else {
        // fallback: try ecommerce_connections endpoint (some integrations live there)
        const res2 = await fetch("/api/v1/ecommerce_connections", { credentials: "same-origin" });
        if (res2.ok) {
          const json2 = await res2.json();
          let list: Integration[] = [];
          if (Array.isArray(json2)) list = json2;
          else if (Array.isArray(json2?.connections)) list = json2.connections;
          else if (Array.isArray(json2?.data)) list = json2.data;
          setIntegrations(list);
        } else {
          const t = await res.text().catch(() => "");
          throw new Error(t || `Failed to load integrations (status ${res.status})`);
        }
      }
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

  const connect = useCallback(
    // navigate to integrations page opening connect flow for provider
    (provider: string) => {
      // Integrations page will handle ?connect=<provider> to start connect flow
      router.push(`/integrations?connect=${encodeURIComponent(provider)}`);
    },
    [router]
  );

  const disconnect = useCallback(
    async (id: string, platform?: string) => {
      // choose endpoint based on platform presence
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
    async (id: string) => {
      // prefer a validation endpoint if it exists
      const url = `/api/v1/ecommerce_connections/${encodeURIComponent(id)}/validate`;
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? body?.message ?? `Test failed (${res.status})`);
      }
      const json = await res.json().catch(() => ({}));
      return json;
    },
    []
  );

  const activeIntegrations = integrations ? integrations.filter((i) => i.status === "active" || i.status === "connected") : [];

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
