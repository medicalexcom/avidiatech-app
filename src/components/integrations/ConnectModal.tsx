"use client";

import React, { useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";

type Field = { name: string; label: string; placeholder?: string; secret?: boolean; type?: string };

const PROVIDER_FIELDS: Record<string, Field[]> = {
  bigcommerce: [
    { name: "storeHash", label: "Store hash", placeholder: "e.g. abc12" },
    { name: "accessToken", label: "Access token", placeholder: "Store API Token", secret: true },
  ],
  shopify: [
    { name: "shopDomain", label: "Shop domain", placeholder: "example.myshopify.com" },
    { name: "accessToken", label: "Access token", placeholder: "Admin API token", secret: true },
  ],
  woocommerce: [
    { name: "consumerKey", label: "Consumer key", placeholder: "ck_xxx" },
    { name: "consumerSecret", label: "Consumer secret", placeholder: "cs_xxx", secret: true },
  ],
};

type Props = {
  provider: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (connection?: any) => void;
  onOpenConnectorManager?: () => void;
};

export default function ConnectModal({ provider, open, onClose, onSuccess, onOpenConnectorManager }: Props) {
  const toast = useToast();
  const fields = useMemo(() => (provider ? PROVIDER_FIELDS[provider] ?? null : null), [provider]);

  const initialState = useMemo(() => {
    const s: Record<string, string> = {};
    (fields ?? []).forEach((f) => (s[f.name] = ""));
    return s;
  }, [fields]);

  const [form, setForm] = useState<Record<string, string>>(initialState);
  const [connectionName, setConnectionName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setForm(
      (PROVIDER_FIELDS[provider ?? ""] ?? []).reduce((acc: Record<string, string>, f) => {
        acc[f.name] = "";
        return acc;
      }, {})
    );
    setConnectionName("");
    setError(null);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, open]);

  if (!open) return null;
  if (!provider) return null;

  const hasSchema = !!fields;

  async function submit() {
    if (!hasSchema) {
      toast.info("Opening connector manager for provider");
      onOpenConnectorManager?.();
      return;
    }

    // validate required
    for (const f of fields!) {
      if (!form[f.name] || String(form[f.name]).trim() === "") {
        setError(`Field "${f.label}" is required`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      // Unified endpoint for ecommerce connections
      const url = `/api/v1/ecommerce_connections`;
      const payload: any = {
        provider,
        name: connectionName || undefined,
      };

      // Provider-specific mapping: include either top-level keys for BC or config/secrets for generic providers
      if (provider === "bigcommerce") {
        payload.storeHash = form.storeHash ?? form.store_hash ?? "";
        payload.accessToken = form.accessToken ?? form.access_token ?? "";
      } else {
        // Generic provider: put fields into config/secrets when appropriate
        payload.config = {};
        payload.secrets = {};
        (fields ?? []).forEach((f) => {
          if (f.secret) payload.secrets[f.name] = form[f.name];
          else payload.config[f.name] = form[f.name];
        });
        // If secrets is empty, delete it so server can encrypt empty object itself
        if (Object.keys(payload.secrets).length === 0) delete payload.secrets;
      }

      const res = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        // fallback to ConnectorManager if server says not implemented
        if (res.status === 404 || String(json?.error).includes("not implemented")) {
          toast.info("Falling back to connector manager for advanced flow");
          onOpenConnectorManager?.();
          return;
        }
        setError(json?.error ?? json?.detail ?? `Connect failed (${res.status})`);
        return;
      }

      toast.success(`${provider} connected`);
      onSuccess?.(json.connection ?? null);
      onClose();
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium">Connect {provider}</h3>
            <p className="text-sm text-slate-500 mt-1">Enter credentials to connect {provider} to AvidiaTech.</p>
          </div>
          <div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-700">Close</button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs text-slate-600">Connection name (optional)</label>
            <input
              placeholder="A friendly name (e.g. My Store)"
              value={connectionName}
              onChange={(e) => setConnectionName(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
            <div className="text-xs text-slate-500 mt-1">This name will be shown in the UI instead of the store hash.</div>
          </div>

          {!hasSchema ? (
            <div className="rounded p-3 border bg-slate-50 dark:bg-slate-950/30">
              <div className="text-sm text-slate-700">This provider requires a specialized connect flow.</div>
              <div className="text-xs text-slate-500 mt-2">We will open the connector manager to continue.</div>
              <div className="mt-3 flex justify-end">
                <button onClick={onOpenConnectorManager} className="px-3 py-1 bg-sky-600 text-white rounded">
                  Open connector manager
                </button>
              </div>
            </div>
          ) : (
            <>
              {fields!.map((f) => (
                <div key={f.name}>
                  <label className="block text-xs text-slate-600">{f.label}</label>
                  <input
                    type={f.secret ? "password" : f.type ?? "text"}
                    placeholder={f.placeholder ?? ""}
                    value={form[f.name] ?? ""}
                    onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
              ))}
              {error ? <div className="text-xs text-rose-600 mt-2">{error}</div> : null}
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={onClose} className="px-3 py-1 rounded border">Cancel</button>
                <button onClick={submit} disabled={loading} className="px-4 py-1 rounded bg-sky-600 text-white">
                  {loading ? "Connecting…" : `Connect ${provider}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
