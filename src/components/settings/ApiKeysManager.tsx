"use client";
import React, { useEffect, useState } from "react";

/**
 * Simple API Keys manager scaffold:
 * - list keys (fetch /api/developer/keys)
 * - generate new key (POST /api/developer/keys)
 * - revoke key (DELETE /api/developer/keys/:id)
 *
 * Server endpoints to implement separately.
 */

type Key = { id: string; keyPreview: string; created_at: string; last_used?: string; permissions?: string[] };

export default function ApiKeysManager() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/developer/keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.keys || []))
      .catch(() => setKeys([]))
      .finally(() => setLoading(false));
  }, []);

  async function createKey() {
    const res = await fetch("/api/developer/keys", { method: "POST" });
    const json = await res.json();
    if (json?.key) setKeys((k) => [json.key, ...k]);
  }

  async function revoke(id: string) {
    await fetch(`/api/developer/keys/${id}`, { method: "DELETE" });
    setKeys((k) => k.filter((x) => x.id !== id));
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div>
        <button onClick={createKey}>Generate new API key</button>
      </div>

      <div style={{ marginTop: 12 }}>
        {loading ? (
          <p>Loading…</p>
        ) : keys.length === 0 ? (
          <p>No keys</p>
        ) : (
          <ul>
            {keys.map((k) => (
              <li key={k.id} style={{ marginBottom: 8 }}>
                <strong>{k.keyPreview}</strong> <small>created {new Date(k.created_at).toLocaleString()}</small>
                <div>
                  <button onClick={() => navigator.clipboard.writeText(k.keyPreview)}>Copy</button>
                  <button onClick={() => revoke(k.id)} style={{ marginLeft: 8 }}>
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
