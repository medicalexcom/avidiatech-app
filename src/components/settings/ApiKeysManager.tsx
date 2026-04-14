"use client";

import React, { useEffect, useState } from "react";

type Key = {
  id: string;
  keyPreview: string;
  created_at: string;
  last_used?: string;
  permissions?: string[];
};

function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
      <rect x="5" y="5" width="9" height="9" rx="1" />
      <path d="M11 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v7a1 1 0 001 1h2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
      <path d="M3 8l3.5 3.5L13 4" />
    </svg>
  );
}

function KeyRow({ k, onRevoked }: { k: Key; onRevoked: () => void }) {
  const [copied, setCopied]       = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [revoking, setRevoking]   = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  function copyPreview() {
    navigator.clipboard.writeText(k.keyPreview).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function revoke() {
    setRevoking(true);
    setRevokeError(null);
    try {
      const res  = await fetch(`/api/developer/keys/${k.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Server error ${res.status}`);
      onRevoked();
    } catch (err: any) {
      setRevokeError(err?.message || "Failed to revoke key.");
      setConfirming(false);
    } finally {
      setRevoking(false);
    }
  }

  return (
    <li className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[12px] text-slate-700 dark:text-slate-300 truncate">{k.keyPreview}</p>
          <p className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500">
            Created {new Date(k.created_at).toLocaleDateString([], { dateStyle: "medium" })}
            {k.last_used && (
              <> &nbsp;·&nbsp; Last used {new Date(k.last_used).toLocaleDateString([], { dateStyle: "medium" })}</>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Copy preview */}
          <button
            onClick={copyPreview}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11.5px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy"}
          </button>

          {/* Revoke — inline confirm */}
          {confirming ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11.5px] text-slate-500 dark:text-slate-400">Revoke?</span>
              <button
                onClick={revoke}
                disabled={revoking}
                className="inline-flex h-7 items-center rounded-lg bg-red-600 px-2.5 text-[11.5px] font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                {revoking ? "Revoking…" : "Yes"}
              </button>
              <button
                onClick={() => { setConfirming(false); setRevokeError(null); }}
                disabled={revoking}
                className="inline-flex h-7 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[11.5px] font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="inline-flex h-7 items-center rounded-lg border border-red-200 bg-white px-2.5 text-[11.5px] font-medium text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 dark:border-red-500/30 dark:bg-slate-900 dark:hover:bg-red-500/10"
            >
              Revoke
            </button>
          )}
        </div>
      </div>

      {revokeError && (
        <p className="mt-2 text-[11.5px] text-red-600 dark:text-red-400">{revokeError}</p>
      )}
    </li>
  );
}

export default function ApiKeysManager() {
  const [keys, setKeys]         = useState<Key[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newKey, setNewKey]     = useState<string | null>(null);
  const [newKeyCopied, setNewKeyCopied] = useState(false);

  async function fetchKeys() {
    setLoading(true);
    setLoadError(null);
    try {
      const res  = await fetch("/api/developer/keys");
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Server error ${res.status}`);
      setKeys(json?.keys || []);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load API keys.");
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchKeys(); }, []);

  async function createKey() {
    setCreating(true);
    setCreateError(null);
    try {
      const res  = await fetch("/api/developer/keys", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Server error ${res.status}`);
      if (json?.key) {
        setNewKey(json.key);
        setNewKeyCopied(false);
        await fetchKeys();
      } else {
        throw new Error("Server did not return a key.");
      }
    } catch (err: any) {
      setCreateError(err?.message || "Unable to create key. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  function copyNewKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey).then(() => {
      setNewKeyCopied(true);
      setTimeout(() => setNewKeyCopied(false), 2500);
    });
  }

  return (
    <div className="max-w-4xl space-y-5">

      {/* ── Header card ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-card dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50">API Keys</h2>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              Programmatic access to the AvidiaTech API. Keep keys secret — never commit them to source control.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <button
              onClick={createKey}
              disabled={creating}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Generating…" : "+ Generate new key"}
            </button>
            {createError && (
              <p className="text-[11.5px] text-red-600 dark:text-red-400">{createError}</p>
            )}
          </div>
        </div>

        {/* ── New key reveal ─────────────────────────────────────────── */}
        {newKey && (
          <div className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-500/8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold text-amber-800 dark:text-amber-300">
                  Copy your new API key now
                </p>
                <p className="mt-0.5 text-[11.5px] text-amber-700/80 dark:text-amber-400/70">
                  This key will only be shown once. Store it securely before closing.
                </p>
              </div>
              <button
                onClick={() => setNewKey(null)}
                className="shrink-0 text-amber-600/60 transition hover:text-amber-700 dark:text-amber-400/50 dark:hover:text-amber-400"
                aria-label="Dismiss"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M12 4L4 12M4 4l8 8" />
                </svg>
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-lg border border-amber-200/60 bg-white/80 px-3 py-2 font-mono text-[12px] text-slate-800 dark:border-amber-500/20 dark:bg-slate-900/60 dark:text-slate-200">
                {newKey}
              </code>
              <button
                onClick={copyNewKey}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-amber-600 px-3 text-[12px] font-semibold text-white shadow-sm transition hover:bg-amber-700"
              >
                {newKeyCopied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Keys list ──────────────────────────────────────────────── */}
        <div className="mt-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="skeleton h-16 rounded-xl" />
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-red-200/60 bg-red-50/60 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/8">
              <p className="text-[13px] text-red-700 dark:text-red-400">{loadError}</p>
              <button
                onClick={fetchKeys}
                className="mt-2 text-[12px] font-medium text-red-700 underline-offset-2 hover:underline dark:text-red-400"
              >
                Retry
              </button>
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 py-8 text-center dark:border-slate-800">
              <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">No API keys yet</p>
              <p className="text-[12px] text-slate-400 dark:text-slate-500">
                Generate a key above to enable programmatic access.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {keys.map((k) => (
                <KeyRow key={k.id} k={k} onRevoked={fetchKeys} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Security note ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/60 bg-slate-50/60 px-5 py-4 dark:border-slate-800/60 dark:bg-slate-900/50">
        <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Security tip:</span>{" "}
          Store keys in environment variables, never in source code or client-side bundles. Revoke any key you suspect has been exposed immediately.
        </p>
      </div>
    </div>
  );
}
