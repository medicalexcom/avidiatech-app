"use client";

import React, { useCallback, useEffect, useState } from "react";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  revoked_at: string | null;
  last_used_at?: string | null;
  scopes?: string[];
}

const SCOPES = ["extract", "describe", "seo", "audit", "import", "monitor", "bulk", "admin"] as const;
type Scope = (typeof SCOPES)[number];

function maskKey(key: string) {
  if (key.length <= 8) return key;
  return key.slice(0, 8) + "••••••••••••••••••••••";
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ScopeBadge({ scope }: { scope: string }) {
  const colors: Record<string, string> = {
    admin: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-500/30 dark:text-rose-300",
    extract: "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-500/30 dark:text-sky-300",
    describe: "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/40 dark:border-violet-500/30 dark:text-violet-300",
    seo: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-300",
    audit: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-500/30 dark:text-amber-300",
    import: "bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-500/30 dark:text-teal-300",
    monitor: "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-500/30 dark:text-indigo-300",
    bulk: "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/40 dark:border-orange-500/30 dark:text-orange-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colors[scope] ?? "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"}`}>
      {scope}
    </span>
  );
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<Set<Scope>>(new Set(["extract", "describe", "seo"]));
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const showToast = useCallback((msg: string, tone: "success" | "error" = "success") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/api-keys", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Failed to load keys");
      const json = await res.json();
      setKeys(json.keys ?? []);
    } catch {
      // If the API isn't ready, show empty state gracefully
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name: name.trim(), scopes: [...selectedScopes] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create key");
      if (json.key) setNewKey(json.key);
      await fetchKeys();
      setName("");
      setShowCreate(false);
      showToast("API key created — store it securely");
    } catch (err: any) {
      showToast(err?.message ?? "Failed to create key", "error");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    setRevokingId(id);
    try {
      const res = await fetch("/api/v1/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to revoke key");
      await fetchKeys();
      showToast("Key revoked");
    } catch (err: any) {
      showToast(err?.message ?? "Failed to revoke key", "error");
    } finally {
      setRevokingId(null);
    }
  }

  function copyKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function toggleScope(scope: Scope) {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  }

  const activeKeys = keys.filter((k) => !k.revoked_at);
  const revokedKeys = keys.filter((k) => !!k.revoked_at);

  return (
    <div className="relative flex min-h-full w-full flex-col bg-slate-50 dark:bg-slate-950 dark:text-slate-50 overflow-hidden">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* 3px violet identity stripe */}
        <div className="absolute left-0 top-0 h-[3px] w-full" style={{ backgroundImage: "linear-gradient(90deg,#8b5cf6 0%,#6366f1 60%,transparent 100%)" }} />
        {/* Violet module wash — fades from top */}
        <div className="absolute left-0 top-[3px] h-[70%] w-full dark:hidden" style={{ backgroundImage: "linear-gradient(180deg,rgba(139,92,246,0.09) 0%,rgba(99,102,241,0.04) 38%,transparent 68%)" }} />
        <div className="absolute left-0 top-[3px] h-[70%] w-full hidden dark:block" style={{ backgroundImage: "linear-gradient(180deg,rgba(139,92,246,0.22) 0%,rgba(99,102,241,0.09) 34%,transparent 62%)" }} />
        <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-violet-400/28 blur-3xl dark:bg-violet-500/20" />
        <div className="absolute bottom-0 right-[-8rem] h-72 w-72 rounded-full bg-indigo-300/18 blur-3xl dark:bg-indigo-500/12" />
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg ${
          toast.tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/80 dark:text-emerald-200"
            : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/80 dark:text-rose-200"
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="relative mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Developer Tools · AvidiaAPI
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">API Keys</h1>
            <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
              Create and manage API keys for programmatic access to the AvidiaAPI. Only owners and admins can create or revoke keys.
            </p>
          </div>
          <button
            onClick={() => { setShowCreate(!showCreate); setNewKey(null); }}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-500"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create key
          </button>
        </header>

        {/* New key banner */}
        {newKey && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-950/30">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Copy your API key — it won't be shown again</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg bg-amber-100/80 px-3 py-2 text-sm font-mono text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                    {newKey}
                  </code>
                  <button
                    onClick={copyKey}
                    className="shrink-0 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-200 dark:border-amber-500/30 dark:bg-amber-900/30 dark:text-amber-200"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <button onClick={() => setNewKey(null)} className="text-amber-500 hover:text-amber-700 dark:text-amber-400">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <form onSubmit={createKey} className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm dark:border-violet-500/20 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Create new API key</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Key name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production · Extract pipeline"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 block">Scopes (permissions)</label>
                <div className="flex flex-wrap gap-2">
                  {SCOPES.map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => toggleScope(scope)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase transition-colors ${
                        selectedScopes.has(scope)
                          ? "border-violet-400 bg-violet-100 text-violet-700 dark:border-violet-500/50 dark:bg-violet-950/60 dark:text-violet-300"
                          : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                      }`}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={creating || !name.trim() || selectedScopes.size === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
                >
                  {creating && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  {creating ? "Creating…" : "Create key"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Active keys */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 flex items-center justify-between dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Active keys
            </p>
            <span className="text-xs text-slate-400 dark:text-slate-600">{activeKeys.length} keys</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
          ) : activeKeys.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-slate-400 dark:text-slate-600">
              <svg className="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <p className="text-sm">No active API keys</p>
              <button onClick={() => setShowCreate(true)} className="text-xs font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400">
                Create your first key →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {activeKeys.map((key) => (
                <div key={key.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{key.name}</p>
                      {key.scopes?.map((s) => <ScopeBadge key={s} scope={s} />)}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400 dark:text-slate-600">
                      <span className="font-mono">{key.prefix}••••••••••••••</span>
                      <span>Created {fmtDate(key.created_at)}</span>
                      {key.last_used_at && <span>Last used {fmtDate(key.last_used_at)}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => revokeKey(key.id)}
                    disabled={revokingId === key.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300"
                  >
                    {revokingId === key.id ? (
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : null}
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revoked keys */}
        {revokedKeys.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/60 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-600">Revoked keys</p>
            </div>
            <div className="divide-y divide-slate-100/60 dark:divide-slate-800/40">
              {revokedKeys.map((key) => (
                <div key={key.id} className="flex flex-wrap items-center gap-3 px-5 py-3 opacity-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 line-through">{key.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span className="font-mono">{key.prefix}••••••••••••••</span>
                      <span>Revoked {fmtDate(key.revoked_at)}</span>
                    </div>
                  </div>
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-600 dark:border-rose-500/20 dark:bg-rose-950/20 dark:text-rose-400">
                    Revoked
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security note */}
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 shrink-0 text-slate-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Security best practices</p>
              <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                <li>• Keys are shown once at creation — store them in your secrets manager (Vault, AWS Secrets Manager, etc.)</li>
                <li>• Never commit keys to git or paste them in Slack</li>
                <li>• Use the minimum scopes required for each integration</li>
                <li>• Rotate keys periodically and immediately after suspected exposure</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
