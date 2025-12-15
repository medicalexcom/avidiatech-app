"use client";

import React, { useEffect, useState } from "react";

/**
 * MonitorDashboard
 *
 * Lightweight client UI for listing watches, creating a new watch, triggering checks,
 * and viewing recent events. Matches the page UI and the API routes added under
 * src/app/api/monitor/*.
 */

export default function MonitorDashboard() {
  const [watches, setWatches] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUrl, setNewUrl] = useState("");

  async function loadWatches() {
    setLoading(true);
    try {
      const res = await fetch("/api/monitor/watches");
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) setWatches(j.watches ?? []);
      else setWatches([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents(watchId?: string | null) {
    setLoading(true);
    try {
      const url = watchId ? `/api/monitor/events?watchId=${encodeURIComponent(watchId)}` : `/api/monitor/events`;
      const res = await fetch(url);
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) setEvents(j.events ?? []);
      else setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWatches();
    loadEvents();
    // refresh every 30s while component mounted
    const t = setInterval(() => {
      loadWatches();
      loadEvents();
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  async function createWatch() {
    if (!newUrl) {
      alert("Enter a URL to watch");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/monitor/watches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source_url: newUrl }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        alert("Failed to create watch: " + (j?.error ?? res.statusText));
      } else {
        setNewUrl("");
        await loadWatches();
      }
    } finally {
      setLoading(false);
    }
  }

  async function triggerCheck(watchId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/monitor/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ watchId }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        alert("Check failed: " + (j?.error ?? res.statusText));
      } else {
        alert("Check complete: " + (j?.result?.changed ? "changed" : "no_change"));
        await loadWatches();
        await loadEvents(watchId);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          className="border rounded px-2 py-1 flex-1"
          placeholder="https://example.com/product/..."
        />
        <button onClick={createWatch} className="px-3 py-1 rounded bg-amber-500 text-white">
          Add Watch
        </button>
        <button onClick={() => { loadWatches(); loadEvents(); }} className="px-3 py-1 rounded border">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="col-span-2">
          <h4 className="text-sm font-semibold">Watches</h4>
          <div className="mt-2 space-y-2">
            {loading && !watches.length ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : watches.length === 0 ? (
              <div className="text-sm text-slate-500">No watches configured yet</div>
            ) : (
              watches.map((w) => (
                <div key={w.id} className="p-3 border rounded bg-white/50">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{w.source_url}</div>
                      <div className="text-xs text-slate-500">Last: {w.last_check_at ? new Date(w.last_check_at).toLocaleString() : "never"}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => triggerCheck(w.id)} className="px-2 py-1 text-xs border rounded">Check</button>
                      <button onClick={() => { setNewUrl(w.source_url); }} className="px-2 py-1 text-xs border rounded">Edit</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Recent events</h4>
          <div className="mt-2 space-y-2">
            {loading && !events.length ? (
              <div className="text-sm text-slate-500">Loading…</div>
            ) : events.length === 0 ? (
              <div className="text-sm text-slate-500">No events</div>
            ) : (
              events.slice(0, 6).map((ev) => (
                <div key={ev.id} className="p-2 border rounded bg-slate-50">
                  <div className="text-xs text-slate-500">{ev.event_type}</div>
                  <div className="text-sm font-medium truncate">{ev.payload?.snapshot?.title ?? ev.payload?.snapshot?.url}</div>
                  <div className="text-xs text-slate-400">{new Date(ev.created_at).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
