"use client";

import React, { useEffect, useState } from "react";

/**
 * Webhooks manager UI scaffold:
 * - add endpoint
 * - show last 20 deliveries (fetched from /api/developer/webhooks/logs)
 *
 * Path: src/components/settings/WebhooksManager.tsx
 */

type Delivery = { id: string; status: string; event: string; received_at: string; response_code?: number };

export default function WebhooksManager() {
  const [endpoint, setEndpoint] = useState("");
  const [logs, setLogs] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/developer/webhooks/logs")
      .then((r) => r.json())
      .then((d) => setLogs(d.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  async function addEndpoint() {
    if (!endpoint) return;
    await fetch("/api/developer/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: endpoint })
    });
    setEndpoint("");
    // refresh logs (or endpoints list if implemented)
    const res = await fetch("/api/developer/webhooks/logs");
    const json = await res.json();
    setLogs(json.logs || []);
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <div>
        <label style={{ display: "block", fontWeight: 600 }}>Webhook endpoint</label>
        <input
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="https://example.com/webhook"
          style={{ width: "100%", padding: 8, marginTop: 8 }}
        />
        <button onClick={addEndpoint} style={{ marginTop: 8 }}>
          Add endpoint
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h4>Recent deliveries</h4>
        {loading ? (
          <p>Loading…</p>
        ) : logs.length === 0 ? (
          <p>No delivery logs found</p>
        ) : (
          <ul>
            {logs.map((l) => (
              <li key={l.id}>
                {l.event} — {l.status} — {new Date(l.received_at).toLocaleString()} ({l.response_code ?? "—"})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
