"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * All Events - audit & tracking console (fixed)
 *
 * Cleaned-up and fixed JSX/parsing error. This page:
 * - Loads events (client-side paging)
 * - Filters: event_type, severity, processed (true/false/any)
 * - Search by watch URL or payload content (simple text match)
 * - Sort by created_at, event_type, severity
 * - Metrics: events/day, unique watches changed, processed rate, top event types
 *
 * Uses:
 * - GET /api/monitor/events
 *
 * Path: src/app/dashboard/monitor/events/page.tsx
 */

type SortKey = "created_at" | "event_type" | "severity";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

export default function AllEventsPage() {
  const [events, setEvents] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("any");
  const [severityFilter, setSeverityFilter] = useState<string>("any");
  const [processedFilter, setProcessedFilter] = useState<string>("any");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/monitor/events");
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) setEvents(j.events ?? []);
      else setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Filter + sort memo
  const filteredAndSorted = useMemo(() => {
    const list = events ?? [];
    const q = String(query || "").trim().toLowerCase();
    let out = list.filter((ev) => {
      if (eventTypeFilter !== "any" && (ev.event_type ?? "") !== eventTypeFilter) return false;
      if (severityFilter !== "any" && (ev.severity ?? "") !== severityFilter) return false;
      if (processedFilter !== "any") {
        const proc = !!ev.processed;
        if (processedFilter === "yes" && !proc) return false;
        if (processedFilter === "no" && proc) return false;
      }
      if (q) {
        const hay = `${ev.payload ? JSON.stringify(ev.payload) : ""} ${ev.watch_id ?? ""} ${ev.payload?.snapshot?.url ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    out.sort((a: any, b: any) => {
      let av: any = a[sortKey];
      let bv: any = b[sortKey];
      if (sortKey === "created_at") {
        av = a.created_at ? new Date(a.created_at).getTime() : 0;
        bv = b.created_at ? new Date(b.created_at).getTime() : 0;
      } else {
        av = String(av ?? "");
        bv = String(bv ?? "");
      }
      if (av === bv) return 0;
      return sortDir === "asc" ? (av < bv ? -1 : 1) : av > bv ? -1 : 1;
    });

    return out;
  }, [events, query, eventTypeFilter, severityFilter, processedFilter, sortKey, sortDir]);

  const total = filteredAndSorted.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = filteredAndSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // metrics
  const metrics = useMemo(() => {
    const list = events ?? [];
    if (!list.length) return { eventsPerDay: "—", uniqueWatches: 0, processedPct: "—", topTypes: [] as [string, number][] };
    const now = Date.now();
    const last7 = list.filter((ev) => now - new Date(ev.created_at).getTime() < 7 * 24 * 60 * 60 * 1000);
    const eventsPerDay = Math.round((last7.length / 7) * 10) / 10;
    const uniqueWatches = new Set(list.map((e) => e.watch_id)).size;
    const processed = list.filter((e) => e.processed).length;
    const processedPct = Math.round((processed / list.length) * 100);
    const typeCounts: Record<string, number> = {};
    list.forEach((e) => { typeCounts[e.event_type] = (typeCounts[e.event_type] ?? 0) + 1; });
    const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { eventsPerDay, uniqueWatches, processedPct, topTypes };
  }, [events]);

  return (
    <main className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">All Monitor Events</h1>
            <p className="text-sm text-slate-500">Audit, filter and inspect events produced by the Monitor worker & scraper.</p>
          </div>
          <div className="flex gap-2">
            <a href="/dashboard" className="px-3 py-2 rounded border">Back</a>
            <a href="/dashboard/monitor" className="px-3 py-2 rounded bg-amber-500 text-white">Open Monitor</a>
          </div>
        </header>

        {/* metrics */}
        <section className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border p-3 bg-white">
            <div className="text-xs text-slate-500">Events / day (7d)</div>
            <div className="mt-2 text-2xl font-semibold">{metrics.eventsPerDay}</div>
          </div>
          <div className="rounded-lg border p-3 bg-white">
            <div className="text-xs text-slate-500">Unique watches</div>
            <div className="mt-2 text-2xl font-semibold">{metrics.uniqueWatches}</div>
          </div>
          <div className="rounded-lg border p-3 bg-white">
            <div className="text-xs text-slate-500">Processed %</div>
            <div className="mt-2 text-2xl font-semibold">{metrics.processedPct === "—" ? "—" : `${metrics.processedPct}%`}</div>
          </div>
          <div className="rounded-lg border p-3 bg-white">
            <div className="text-xs text-slate-500">Top event types</div>
            <div className="mt-2 text-sm">
              {metrics.topTypes.length === 0 ? <div className="text-slate-500">—</div> : metrics.topTypes.map(([t, c]) => <div key={t} className="truncate">{t} · {c}</div>)}
            </div>
          </div>
        </section>

        {/* filters */}
        <section className="rounded-lg border bg-white p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search payload / URL..." className="border rounded px-3 py-2 w-96" />
              <select value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)} className="rounded border px-2 py-1 text-sm">
                <option value="any">Any event</option>
                <option value="change_detected">change_detected</option>
                <option value="no_change">no_change</option>
                <option value="scrape_failed">scrape_failed</option>
                <option value="error">error</option>
              </select>
              <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="rounded border px-2 py-1 text-sm">
                <option value="any">Any severity</option>
                <option value="info">info</option>
                <option value="warning">warning</option>
                <option value="critical">critical</option>
              </select>
              <select value={processedFilter} onChange={(e) => setProcessedFilter(e.target.value)} className="rounded border px-2 py-1 text-sm">
                <option value="any">Processed (any)</option>
                <option value="yes">Processed</option>
                <option value="no">Unprocessed</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Sort</label>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="rounded border px-2 py-1 text-sm">
                <option value="created_at">Created</option>
                <option value="event_type">Event type</option>
                <option value="severity">Severity</option>
              </select>
              <select value={sortDir} onChange={(e) => setSortDir(e.target.value as SortDir)} className="rounded border px-2 py-1 text-sm">
                <option value="desc">desc</option>
                <option value="asc">asc</option>
              </select>
              <button onClick={() => { setPage(1); load(); }} className="px-3 py-1 rounded border text-sm">Reload</button>
            </div>
          </div>
        </section>

        {/* list */}
        <section className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">Events</div>
            <div className="text-xs text-slate-500">Showing {Math.min(PAGE_SIZE, total)} of {total} (page {page}/{pages})</div>
          </div>

          <div className="space-y-3">
            {loading && !events ? <div>Loading…</div> : pageItems.length === 0 ? <div className="text-sm text-slate-500">No events</div> : (
              pageItems.map((ev) => (
                <div key={ev.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium truncate">{ev.payload?.snapshot?.title ?? ev.payload?.snapshot?.url ?? ev.event_type}</div>
                        <div className="text-xs text-slate-400">{ev.watch_id ? `watch:${ev.watch_id}` : ""}</div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{ev.event_type} · {ev.severity} · {new Date(ev.created_at).toLocaleString()}</div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(ev.payload ?? ev, null, 2)); alert("Copied payload"); }} className="px-3 py-1 rounded border text-xs">Copy</button>
                      <a href={`/dashboard/monitor/watches?filter=${encodeURIComponent(ev.watch_id ?? "")}`} className="px-3 py-1 rounded border text-xs">Open watch</a>
                    </div>
                  </div>

                  <pre className="mt-3 bg-slate-50 p-3 rounded text-xs max-h-40 overflow-auto">{JSON.stringify(ev.payload ?? {}, null, 2)}</pre>
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
