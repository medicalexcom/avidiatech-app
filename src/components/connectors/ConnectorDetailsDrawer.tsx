"use client";

import React, { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";

type Integration = {
  id: string;
  provider?: string;
  platform?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  config?: Record<string, any>;
  schedule?: any;
  last_error?: string | null;
  org_id?: string | null;
  tenant_id?: string | null;
  status?: string | null;
};

interface Props {
  integrationId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const ConnectorDetailsDrawer: React.FC<Props> = ({ integrationId, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const toast = useToast();

  // source indicates which server resource we loaded from:
  // "ecommerce" means ecommerce_connections row; "legacy" means integrations details
  const [source, setSource] = useState<"ecommerce" | "legacy" | null>(null);

  useEffect(() => {
    if (!isOpen || !integrationId) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    setIntegration(null);
    setTestResult(null);
    setSource(null);

    async function fetchDetails() {
      try {
        // 1) Try ecommerce_connections/:id first (preferred)
        try {
          const res = await fetch(`/api/v1/ecommerce_connections/${encodeURIComponent(integrationId)}`, {
            credentials: "same-origin",
          });
          const json = await res.json().catch(() => null);
          if (res.ok && json) {
            // server may return { ok: true, connection: {...} } or directly the connection object
            const conn = json.connection ?? json;
            if (conn && (conn.platform || conn.tenant_id || conn.config)) {
              if (!mounted) return;
              // normalize ecommerce connection shape to Integration type
              const norm: Integration = {
                id: conn.id,
                provider: conn.platform ?? conn.provider,
                platform: conn.platform ?? conn.provider,
                name: conn.name ?? conn.config?.store_name ?? null,
                config: conn.config ?? {},
                created_at: conn.created_at ?? null,
                updated_at: conn.updated_at ?? null,
                tenant_id: conn.tenant_id ?? null,
                org_id: conn.tenant_id ?? null,
                status: conn.status ?? null,
                last_error: conn.last_error ?? null,
              };
              setIntegration(norm);
              setSource("ecommerce");
              return;
            }
          }
        } catch (e) {
          // ignore and fallback to legacy
        }

        // 2) Fallback to legacy integrations details route
        try {
          const res2 = await fetch(`/api/v1/integrations/${encodeURIComponent(integrationId)}/details`, {
            credentials: "same-origin",
          });
          const json2 = await res2.json().catch(() => null);
          if (!res2.ok || !json2) {
            const msg = (json2 && json2.error) || `Failed to load integration details (${res2.status})`;
            if (!mounted) return;
            setError(msg);
            return;
          }
          // details route returns { ok: true, integration: {...} } or integration object
          const integ = json2.integration ?? json2;
          if (!mounted) return;
          const norm2: Integration = {
            id: integ.id,
            provider: integ.provider ?? integ.name ?? undefined,
            platform: integ.platform ?? undefined,
            name: integ.name ?? integ.display_name ?? integ.id,
            config: integ.config ?? {},
            created_at: integ.created_at ?? null,
            updated_at: integ.updated_at ?? integ.last_synced_at ?? null,
            org_id: integ.org_id ?? integ.tenant_id ?? null,
            status: integ.status ?? null,
            last_error: integ.last_error ?? null,
          };
          setIntegration(norm2);
          setSource("legacy");
          return;
        } catch (e: any) {
          if (!mounted) return;
          setError(String(e?.message ?? e));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchDetails();

    return () => {
      mounted = false;
    };
  }, [isOpen, integrationId]);

  // focus container when open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => containerRef.current?.focus(), 50);
    }
  }, [isOpen]);

  async function runTest() {
    if (!integrationId && !integration?.id) {
      toast.error("Integration id missing");
      return;
    }
    const id = integrationId ?? integration!.id;
    setTesting(true);
    setTestResult(null);
    try {
      // prefer ecommerce validate when source === "ecommerce"
      if (source === "ecommerce") {
        const res = await fetch(`/api/v1/ecommerce_connections/${encodeURIComponent(id)}/validate`, {
          credentials: "same-origin",
        });
        const j = await res.json().catch(() => null);
        if (!res.ok || j?.ok === false) {
          const msg = j?.error ?? j?.detail ?? `Validation failed (${res.status})`;
          setTestResult({ ok: false, error: msg });
          toast.error(msg);
          return;
        }
        setTestResult({ ok: true });
        toast.success("Connection validated");
        return;
      }

      // fallback to legacy test endpoint
      const res2 = await fetch(`/api/v1/integrations/${encodeURIComponent(id)}/test`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
      });
      const j2 = await res2.json().catch(() => null);
      if (!res2.ok || j2?.ok === false) {
        const msg = j2?.error ?? `Test failed (${res2.status})`;
        setTestResult({ ok: false, error: msg });
        toast.error(msg);
        return;
      }
      setTestResult({ ok: true });
      toast.success("Connection validated");
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      setTestResult({ ok: false, error: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  }

  async function startSync() {
    if (!integrationId && !integration?.id) {
      toast.error("Integration id missing");
      return;
    }
    const id = integrationId ?? integration!.id;
    try {
      // prefer ecommerce sync when source === "ecommerce"
      if (source === "ecommerce") {
        const res = await fetch(`/api/v1/ecommerce_connections/${encodeURIComponent(id)}/sync`, {
          method: "POST",
          credentials: "same-origin",
        });
        const j = await res.json().catch(() => null);
        if (!res.ok || !j?.ok) {
          // fallback to legacy if available
          const res2 = await fetch(`/api/v1/integrations/${encodeURIComponent(id)}/sync`, {
            method: "POST",
            credentials: "same-origin",
          });
          const j2 = await res2.json().catch(() => null);
          if (!res2.ok || !j2?.ok) throw new Error(j2?.error ?? `Sync failed (${res2.status})`);
          toast.success(j2?.jobId ? `Sync queued (job ${j2.jobId})` : "Sync started");
          return;
        }
        toast.success(j?.jobId ? `Sync queued (job ${j.jobId})` : "Sync started");
        return;
      }

      // legacy sync
      const res2 = await fetch(`/api/v1/integrations/${encodeURIComponent(id)}/sync`, {
        method: "POST",
        credentials: "same-origin",
      });
      const j2 = await res2.json().catch(() => null);
      if (!res2.ok || !j2?.ok) throw new Error(j2?.error ?? `Sync failed (${res2.status})`);
      toast.success(j2?.jobId ? `Sync queued (job ${j2.jobId})` : "Sync started");
    } catch (e: any) {
      toast.error(String(e?.message ?? e));
    }
  }

  function prettyStoreInfo(cfg?: Record<string, any>) {
    if (!cfg) return "—";
    const storeHash = cfg.store_hash ?? cfg.storeHash ?? null;
    const domain = cfg.domain ?? cfg.store_domain ?? cfg.hostname ?? cfg.storeUrl ?? null;
    if (storeHash && domain) return `${domain} • ${storeHash}`;
    if (storeHash) return storeHash;
    if (domain) return domain;
    return JSON.stringify(cfg);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <aside
        ref={containerRef}
        tabIndex={-1}
        className="ml-auto w-full max-w-lg bg-white dark:bg-slate-900 shadow-xl p-6 overflow-auto"
        aria-label="Connector details"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Connector details</h2>
            <p className="text-sm text-gray-500">Inspect and run actions for this connector.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="ml-4 rounded p-1 text-gray-600 hover:text-gray-900">✕</button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : error ? (
          <div className="text-sm text-rose-600">Error: {error}</div>
        ) : integration ? (
          <>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                Provider: <strong className="text-gray-800">{integration.provider ?? integration.platform ?? "—"}</strong>
              </div>
              <div className="text-sm text-gray-600">
                Name: <strong className="text-gray-800">{integration.name ?? integration.id}</strong>
              </div>
              <div className="text-sm text-gray-600">
                Created: <strong className="text-gray-800">{integration.created_at ?? "—"}</strong>
              </div>
              <div className="text-sm text-gray-600">
                Org/Tenant:{" "}
                <strong className="text-gray-800">{integration.org_id ?? integration.tenant_id ?? <span className="text-slate-400">Not associated</span>}</strong>
              </div>
            </div>

            <section className="mt-4">
              <h3 className="font-medium mb-2">Configuration</h3>
              <pre className="text-xs bg-gray-100 dark:bg-slate-800 p-3 rounded max-h-44 overflow-auto">
                {JSON.stringify(integration.config ?? {}, null, 2)}
              </pre>
            </section>

            <section className="mt-4">
              <h3 className="font-medium mb-2">Schedule</h3>
              {integration.schedule ? (
                <pre className="text-sm bg-gray-50 dark:bg-slate-800 p-2 rounded">
                  {JSON.stringify(integration.schedule, null, 2)}
                </pre>
              ) : (
                <div className="text-sm text-gray-500">No schedule configured</div>
              )}
            </section>

            {integration.last_error && (
              <div className="mt-4 text-sm text-rose-600">Last error: {integration.last_error}</div>
            )}

            <div className="mt-6 flex gap-2 items-center">
              <button
                onClick={async () => {
                  await startSync();
                }}
                className="px-4 py-2 rounded bg-blue-600 text-white"
              >
                Sync now
              </button>

              <a
                href={`/integrations/${integration.id}/edit`}
                className="px-4 py-2 rounded border text-sm text-gray-700 hover:bg-gray-50"
              >
                Edit
              </a>

              <button
                onClick={runTest}
                disabled={testing}
                className={`px-4 py-2 rounded text-sm ${testing ? "bg-gray-300" : "bg-emerald-600 text-white"}`}
              >
                {testing ? "Testing…" : "Test connection"}
              </button>

              <button
                onClick={() => {
                  const info = prettyStoreInfo(integration.config);
                  navigator.clipboard?.writeText(info);
                  toast.success("Store info copied");
                }}
                className="px-3 py-2 rounded border text-sm text-gray-700"
              >
                Copy store info
              </button>
            </div>

            {testResult ? (
              <div className={`mt-4 rounded-md p-3 text-sm ${testResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
                {testResult.ok ? "Connection succeeded" : `Connection failed: ${testResult.error ?? "unknown error"}`}
              </div>
            ) : null}
          </>
        ) : (
          <div className="text-sm text-gray-500">No integration selected</div>
        )}
      </aside>
    </div>
  );
};

export default ConnectorDetailsDrawer;
