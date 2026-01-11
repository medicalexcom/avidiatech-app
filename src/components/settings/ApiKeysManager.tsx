"use client";

import React, { useEffect, useState } from "react";

/**
 * ApiKeysManager: generate, show, copy and revoke keys
 * - newly created key shown once in modal
 */

type Key = { id: string; keyPreview: string; created_at: string; last_used?: string; permissions?: string[] };

export default function ApiKeysManager() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    setLoading(true);
    try {
      const res = await fetch("/api/developer/keys");
      const json = await res.json();
      setKeys(json.keys || []);
    } catch (err) {
      console.error(err);
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }

  async function createKey() {
    setCreating(true);
    try {
      const res = await fetch("/api/developer/keys", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.key) {
        // the backend should return full key string once on creation
        setNewKey(json.key);
        // refresh list (key preview)
        await fetchKeys();
      } else {
        alert(json?.error || "Unable to create key");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key?")) return;
    await fetch(`/api/developer/keys/${id}`, { method: "DELETE" });
    await fetchKeys();
  }

  function copyToClipboard(text: string | null) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard"));
  }

  return (
    <div className="max-w-4xl">
      <div className="bg-white dark:bg-slate-900 border rounded-lg p-6 shadow-sm">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">API Keys</h2>
          <div>
            <button onClick={createKey} disabled={creating} className="px-3 py-2 bg-indigo-600 text-white rounded">
              {creating ? "Generating…" : "Generate new key"}
            </button>
          </div>
        </div>

        <p className="mt-2 text-sm text-slate-500">Your API keys allow programmatic access. Keep them secret.</p>

        <div className="mt-4">
          {loading ? (
            <p>Loading…</p>
          ) : keys.length === 0 ? (
            <p>No keys found</p>
          ) : (
            <ul className="space-y-3">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 border rounded p-3">
                  <div>
                    <div className="font-mono text-sm">{k.keyPreview}</div>
                    <div className="text-xs text-slate-500">Created {new Date(k.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => copyToClipboard(k.keyPreview)} className="text-sm px-2 py-1 border rounded">Copy</button>
                    <button onClick={() => revoke(k.id)} className="text-sm text-red-600">Revoke</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {newKey && (
          <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900 border rounded">
            <div className="font-semibold">New key</div>
            <div className="font-mono text-sm mt-2 break-all">{newKey}</div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => copyToClipboard(newKey)} className="px-3 py-2 bg-indigo-600 text-white rounded">Copy key</button>
              <button onClick={() => setNewKey(null)} className="px-3 py-2 border rounded">Close</button>
            </div>
            <div className="text-xs text-slate-500 mt-2">Note: This key will only be shown once. Store it securely.</div>
          </div>
        )}
      </div>
    </div>
  );
}
