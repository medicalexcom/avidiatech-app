"use client";

import React, { useEffect, useState } from "react";

export default function NotificationsList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/monitor/notifications");
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) setItems(j.notifications ?? []);
      else setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: string) {
    try {
      const res = await fetch(`/api/monitor/notifications`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, read: true }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error ?? "patch failed");
      await load();
    } catch (err: any) {
      alert(String(err?.message ?? err));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Notifications</h3>
        <button onClick={load} className="px-2 py-1 border rounded text-sm">Refresh</button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : items.length === 0 ? (
        <div className="p-6 text-center">
          <div className="text-lg font-semibold">No notifications yet</div>
          <p className="text-sm text-slate-500 mt-2">Notifications appear when a rule matches an event (e.g., price change). Try one of the actions below to generate a test notification.</p>
          <div className="mt-4 flex justify-center gap-3">
            <a href="/dashboard/monitor" className="px-4 py-2 rounded border text-sm">Add watch</a>
            <a href="/dashboard/monitor/rules" className="px-4 py-2 rounded bg-amber-500 text-white text-sm">Create rule</a>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className={`p-3 border rounded ${n.read ? "bg-white/60" : "bg-amber-50"}`}>
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{n.title}</div>
                  <div className="text-xs text-slate-500">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                <div>
                  {!n.read && <button onClick={() => markRead(n.id)} className="px-2 py-1 border rounded text-xs">Mark read</button>}
                </div>
              </div>
              <pre className="mt-2 text-xs bg-slate-50 p-2 rounded max-h-48 overflow-auto">{JSON.stringify(n.payload ?? n.body ?? {}, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
