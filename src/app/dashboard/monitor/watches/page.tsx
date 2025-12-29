"use client";

import React, { useEffect, useMemo, useState } from "react";
import MonitorDashboard from "@/components/monitor/MonitorDashboard";

/**
 * All Watches - full list & admin console
 *
 * Features:
 * - Loads all watches (client-side paging)
 * - Filters: status (ok/changed/scrape_failed/error/any), auto_watch, linked-to-product
 * - Search by URL
 * - Sort by last_check_at, frequency_seconds, retry_count
 * - Inline actions: Run check, Mute/Unmute, Save frequency, Delete
 * - Top-line metrics summary (counts, avg frequency, failing count, product-linked %)
 *
 * Notes:
 * - Uses existing API endpoints:
 *   GET /api/monitor/watches
 *   PATCH /api/monitor/watches/:id
 *   DELETE /api/monitor/watches/:id
 *   POST /api/monitor/check (body:{ watchId })
 *
 * Drop at: src/app/dashboard/monitor/watches/page.tsx
 */

type SortKey = "last_check_at" | "frequency_seconds" | "retry_count" | "created_at";
type SortDir = "asc" | "desc";

export default function AllWatchesPage() {
  const [watches, setWatches] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("any");
  const [autoFilter, setAutoFilter] = useState<string>("any");
  const [linkedFilter, setLinkedFilter] = useState<string>("any");
  const [sortKey, setSortKey] = useState<SortKey>("last_check_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // fetch watches
  async function load() {
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

  useEffect(() => {
    load();
  }, []);

  // derived: filter / search / sort
  const filtered = useMemo(() => {
    const list = watches ?? [];
    const q = String(query || "").trim().toLowerCase();
    let out = list.filter((w) => {
      if (statusFilter !== "any") {
        if ((w.last_status ?? "unknown") !== statusFilter) return false;
      }
      if (autoFilter !== "any") {
        if (autoFilter === "yes" && !w.auto_watch) return false;
        if (autoFilter === "no" && w.auto_watch) return false;
      }
      if (linkedFilter !== "any") {
        if (linkedFilter === "yes" && !w.product_id) return false;
        if (linkedFilter === "no" && w.product_id) return false;
      }
      if (q) {
        if (!String(w.source_url ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });

    out.sort((a: any, b: any) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      // normalize dates
      if (sortKey === "last_check_at" || sortKey === "created_at") {
        av = a[sortKey] ? new Date(a[sortKey]).getTime() : 0;
        bv = b[sortKey] ? new Date(b[sortKey]).getTime() : 0;
      } else {
        av = Number(av ?? 0);
        bv = Number(bv ?? 0);
      }
      if (av === bv) return 0;
      return sortDir === "asc" ? (av < bv ? -1 : 1) : av > bv ? -1 : 1;
    });

    return out;
  }, [watches, query, statusFilter, autoFilter, linkedFilter, sortKey, sortDir]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // metrics
  const metrics = useMemo(() => {
    const list = watches ?? [];
    const totalW = list.length;
    if (totalW === 0) {
      return {
        total: 0,
        failing: 0,
        avgFrequencyDays: "—",
        productLinkedPct: "—",
        autoWatchPct: "—",
      };
    }
    const failing = list.filter((w) => (w.last_status && String(w.last_status) !== "ok") || Number(w.retry_count ?? 0) > 0).length;
    const avgFreq =
      Math.round(
        (list.reduce((acc, w) => acc + Number(w.frequency_seconds ?? 86400), 0) / totalW / (24 * 60 * 60)) * 10
      ) / 10;
    const linkedPct = Math.round((list.filter((w) => !!w.product_id).length / totalW) * 100);
    const autoPct = Math.round((list.filter((w) => !!w.auto_watch).length / totalW) * 100);
    return { total: totalW, failing, avgFrequencyDays: avgFreq, productLinkedPct: linkedPct, autoWatchPct: autoPct };
  }, [watches]);

  // actions
  async function runCheck(id: string) {
    try {
      const res = await fetch("/api/monitor/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ watchId: id }) });
      await res.json().catch(() => null);
      // reload to pick up events/status changes
      load();
    } catch (err) {
      console.warn(err);
    }
  }

  async function saveFreq(id: string, days: number) {
    const patch = { frequency_seconds: Math.max(1, Math.round(days * 24 * 60 * 60)) };
    await fetch(`/api/monitor/watches/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    load();
  }

  async function toggleMute(id: string, mutedUntil: string | null) {
    const patch = { muted_until: mutedUntil ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };
    await fetch(`/api/monitor/watches/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    load();
  }

  async function removeWatch(id: string) {
    if (!confirm("Delete this watch? This cannot be undone.")) return;
    await fetch(`/api/monitor/watches/${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">All Watches</h1>
            <p className="text-sm text-slate-500">Full list of watches with sorting, filtering, and bulk-friendly controls.</p>
          </div>
          <div className="flex gap-2">
            <a href="/dashboard" className="px-3 py-2 rounded border">Back</a>
            <a href="#top" className="px-3 py-2 rounded bg-amber-500 text-white">Open Monitor</a>
          </div>
        </header>

        {/* Metrics */}
        <section className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border p-3 bg-white">
            <div className="text-xs text-slate-500">Total watches</div>
            <div className="mt-2 text-2xl font-semibold">{metrics.total}</div>
          </div>
          <div className="rounded-lg border p-3 bg-white">
            <div className="text-xs text-slate-500">Failing watches</div>
            <div className="mt-2 text-2xl font-semibold">{metrics.failing}</div>
          </div>
          <div className="rounded-lg border p-3 bg-white">
            <div className="text-xs text-slate-500">Avg frequency (days)</div>
            <div className="mt-2 text-2xl font-semibold">{metrics.avgFrequencyDays}</div>
          </div>
          <div className="rounded-lg border p-3 bg-white">
            <div className="text-xs text-slate-500">Linked to product / Auto-watch</div>
            <div className="mt-2 text-lg font-semibold">{metrics.productLinkedPct}% · {metrics.autoWatchPct}%</div>
          </div>
        </section>

        {/* Filters & controls */}
        <section className="rounded-lg border bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search URL..." className="border rounded px-3 py-2 w-80" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded border px-2 py-1 text-sm">
                <option value="any">All statuses</option>
                <option value="ok">ok</option>
                <option value="changed">changed</option>
                <option value="scrape_failed">scrape_failed</option>
                <option value="error">error</option>
              </select>
              <select value={autoFilter} onChange={(e) => setAutoFilter(e.target.value)} className="rounded border px-2 py-1 text-sm">
                <option value="any">Auto watch (any)</option>
                <option value="yes">Auto only</option>
                <option value="no">Manual only</option>
              </select>
              <select value={linkedFilter} onChange={(e) => setLinkedFilter(e.target.value)} className="rounded border px-2 py-1 text-sm">
                <option value="any">Product link (any)</option>
                <option value="yes">Linked</option>
                <option value="no">Unlinked</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Sort</label>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="rounded border px-2 py-1 text-sm">
                <option value="last_check_at">Last check</option>
                <option value="frequency_seconds">Frequency (sec)</option>
                <option value="retry_count">Retry count</option>
                <option value="created_at">Created</option>
              </select>
              <select value={sortDir} onChange={(e) => setSortDir(e.target.value as SortDir)} className="rounded border px-2 py-1 text-sm">
                <option value="desc">desc</option>
                <option value="asc">asc</option>
              </select>

              <button onClick={() => { setPage(1); load(); }} className="px-3 py-1 rounded border text-sm">Reload</button>
            </div>
          </div>
        </section>

        {/* List */}
        <section className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Watches</div>
            <div className="text-xs text-slate-500">Showing {Math.min(PAGE_SIZE, total)} of {total} (page {page}/{pages})</div>
          </div>

          <div className="space-y-3">
            {loading && !watches ? (
              <div>Loading…</div>
            ) : pageItems.length === 0 ? (
              <div className="text-sm text-slate-500">No watches</div>
            ) : (
              pageItems.map((w) => (
                <div key={w.id} className="p-3 border rounded-lg flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="font-medium truncate">{w.source_url}</div>
                      <div className="text-xs text-slate-400">{w.product_id ? "linked" : "unlinked"}</div>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Last: {w.last_check_at ? new Date(w.last_check_at).toLocaleString() : "never"} · Status: <span className="font-medium">{w.last_status ?? "unknown"}</span> · Retries: {w.retry_count ?? 0}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <button onClick={() => runCheck(w.id)} className="px-2 py-1 text-xs border rounded">Check</button>
                        <button onClick={() => toggleMute(w.id, w.muted_until)} className="px-2 py-1 text-xs border rounded">{w.muted_until ? "Unmute" : "Mute"}</button>
                        <button onClick={() => removeWatch(w.id)} className="px-2 py-1 text-xs border rounded text-red-600">Delete</button>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500">Freq days</label>
                        <input type="number" defaultValue={Math.max(1, Math.round((w.frequency_seconds ?? 86400) / (24 * 60 * 60)))} onBlur={(e) => saveFreq(w.id, Number(e.currentTarget.value))} className="w-20 rounded border px-2 py-1 text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">Page {page} of {pages}</div>
            <div className="flex gap-2">
              <button onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1 border rounded text-sm">First</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm">Prev</button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1 border rounded text-sm">Next</button>
              <button onClick={() => setPage(pages)} disabled={page === pages} className="px-3 py-1 border rounded text-sm">Last</button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
