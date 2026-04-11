"use client";

import React, { useEffect, useMemo, useState } from "react";

type SortKey = "last_check_at" | "frequency_seconds" | "retry_count" | "created_at";
type SortDir = "asc" | "desc";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ok: "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-300",
    changed: "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-300",
    scrape_failed: "border-red-200/70 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300",
    error: "border-red-200/70 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-300",
  };
  const cls = map[status] ?? "border-slate-200/70 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", cls)}>
      {status}
    </span>
  );
}

function fmtDate(iso?: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AllWatchesPage() {
  const [watches, setWatches] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("any");
  const [autoFilter, setAutoFilter] = useState("any");
  const [linkedFilter, setLinkedFilter] = useState("any");
  const [sortKey, setSortKey] = useState<SortKey>("last_check_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

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

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const list = watches ?? [];
    const q = query.trim().toLowerCase();
    let out = list.filter((w) => {
      if (statusFilter !== "any" && (w.last_status ?? "unknown") !== statusFilter) return false;
      if (autoFilter !== "any") {
        if (autoFilter === "yes" && !w.auto_watch) return false;
        if (autoFilter === "no" && w.auto_watch) return false;
      }
      if (linkedFilter !== "any") {
        if (linkedFilter === "yes" && !w.product_id) return false;
        if (linkedFilter === "no" && w.product_id) return false;
      }
      if (q && !String(w.source_url ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
    out.sort((a: any, b: any) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === "last_check_at" || sortKey === "created_at") {
        av = a[sortKey] ? new Date(a[sortKey]).getTime() : 0;
        bv = b[sortKey] ? new Date(b[sortKey]).getTime() : 0;
      } else { av = Number(av ?? 0); bv = Number(bv ?? 0); }
      if (av === bv) return 0;
      return sortDir === "asc" ? (av < bv ? -1 : 1) : av > bv ? -1 : 1;
    });
    return out;
  }, [watches, query, statusFilter, autoFilter, linkedFilter, sortKey, sortDir]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const metrics = useMemo(() => {
    const list = watches ?? [];
    if (!list.length) return { total: 0, failing: 0, avgFrequencyDays: "—" as any, productLinkedPct: "—" as any, autoWatchPct: "—" as any };
    const failing = list.filter((w) => (w.last_status && String(w.last_status) !== "ok") || Number(w.retry_count ?? 0) > 0).length;
    const avgFreq = Math.round((list.reduce((acc, w) => acc + Number(w.frequency_seconds ?? 86400), 0) / list.length / (24 * 60 * 60)) * 10) / 10;
    const linkedPct = Math.round((list.filter((w) => !!w.product_id).length / list.length) * 100);
    const autoPct = Math.round((list.filter((w) => !!w.auto_watch).length / list.length) * 100);
    return { total: list.length, failing, avgFrequencyDays: avgFreq, productLinkedPct: linkedPct, autoWatchPct: autoPct };
  }, [watches]);

  async function runCheck(id: string) {
    try {
      await fetch("/api/monitor/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ watchId: id }) });
      load();
    } catch {}
  }

  async function saveFreq(id: string, days: number) {
    await fetch(`/api/monitor/watches/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ frequency_seconds: Math.max(1, Math.round(days * 24 * 60 * 60)) }) });
    load();
  }

  async function toggleMute(id: string, mutedUntil: string | null) {
    const muted_until = mutedUntil ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await fetch(`/api/monitor/watches/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ muted_until }) });
    load();
  }

  async function removeWatch(id: string) {
    if (!confirm("Delete this watch? This cannot be undone.")) return;
    await fetch(`/api/monitor/watches/${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="relative flex min-h-full w-full flex-col max-w-[100vw] overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* 3px amber identity stripe */}
        <div className="absolute left-0 top-0 h-[3px] w-full" style={{ backgroundImage: "linear-gradient(90deg,#f59e0b 0%,#fb923c 60%,transparent 100%)" }} />
        {/* Amber module wash — fades from top */}
        <div className="absolute left-0 top-[3px] h-[70%] w-full dark:hidden" style={{ backgroundImage: "linear-gradient(180deg,rgba(245,158,11,0.09) 0%,rgba(251,146,60,0.05) 38%,transparent 68%)" }} />
        <div className="absolute left-0 top-[3px] h-[70%] w-full hidden dark:block" style={{ backgroundImage: "linear-gradient(180deg,rgba(245,158,11,0.22) 0%,rgba(251,146,60,0.10) 34%,transparent 62%)" }} />
        <div className="absolute -top-44 -left-36 h-96 w-96 rounded-full bg-amber-400/28 blur-3xl dark:bg-amber-500/20" />
        <div className="absolute -bottom-44 right-[-12rem] h-[28rem] w-[28rem] rounded-full bg-orange-300/18 blur-3xl dark:bg-orange-500/12" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.92)_58%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_58%,_rgba(15,23,42,1)_100%)]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl space-y-6 px-4 pt-4 pb-10 sm:px-6 lg:px-8 lg:pt-6">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              All{" "}
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-sky-500 bg-clip-text text-transparent">
                Watches
              </span>
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Full list with sorting, filtering, and per-watch controls.
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/dashboard/monitor" className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
              ← Monitor
            </a>
            <a href="/dashboard/monitor" className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm">
              Open Monitor
            </a>
          </div>
        </header>

        {/* Metrics */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total watches", value: metrics.total, color: "text-slate-900 dark:text-slate-50" },
            { label: "Failing watches", value: metrics.failing, color: "text-red-600 dark:text-red-400" },
            { label: "Avg frequency (days)", value: metrics.avgFrequencyDays, color: "text-sky-600 dark:text-sky-400" },
            { label: "Linked / Auto", value: `${metrics.productLinkedPct}% · ${metrics.autoWatchPct}%`, color: "text-amber-600 dark:text-amber-400" },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/45">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{m.label}</p>
              <p className={cx("mt-2 text-xl font-semibold", m.color)}>{m.value}</p>
            </div>
          ))}
        </section>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/45">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search URL…"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 md:w-72"
            />
            {[
              { value: statusFilter, onChange: setStatusFilter, options: [["any","All statuses"],["ok","ok"],["changed","changed"],["scrape_failed","scrape_failed"],["error","error"]] },
              { value: autoFilter, onChange: setAutoFilter, options: [["any","Auto (any)"],["yes","Auto only"],["no","Manual only"]] },
              { value: linkedFilter, onChange: setLinkedFilter, options: [["any","Link (any)"],["yes","Linked"],["no","Unlinked"]] },
              { value: sortKey, onChange: (v: string) => setSortKey(v as SortKey), options: [["last_check_at","Last check"],["frequency_seconds","Frequency"],["retry_count","Retries"],["created_at","Created"]] },
              { value: sortDir, onChange: (v: string) => setSortDir(v as SortDir), options: [["desc","desc"],["asc","asc"]] },
            ].map((sel, i) => (
              <select key={i} value={sel.value} onChange={(e) => sel.onChange(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                {sel.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            <button onClick={() => { setPage(1); load(); }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              Reload
            </button>
          </div>
        </div>

        {/* Watch list */}
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/45 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">Watches</p>
            <p className="text-[12px] text-slate-500">Showing {Math.min(PAGE_SIZE, total)} of {total} · Page {page}/{pages}</p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading && !watches ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500" />
                <p className="mt-3 text-sm text-slate-500">Loading watches…</p>
              </div>
            ) : pageItems.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">No watches match this filter</p>
              </div>
            ) : pageItems.map((w) => (
              <div key={w.id} className="flex flex-col gap-3 px-4 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={w.last_status ?? "unknown"} />
                    {w.auto_watch && <span className="text-[11px] text-slate-400 dark:text-slate-500">auto</span>}
                    {w.product_id && <span className="text-[11px] text-emerald-600 dark:text-emerald-400">linked</span>}
                    {w.muted_until && <span className="text-[11px] text-amber-600 dark:text-amber-400">muted</span>}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">{w.source_url}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                    Last checked: {fmtDate(w.last_check_at)} · Retries: {w.retry_count ?? 0}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] text-slate-500">Days</label>
                    <input
                      type="number"
                      defaultValue={Math.max(1, Math.round((w.frequency_seconds ?? 86400) / (24 * 60 * 60)))}
                      onBlur={(e) => saveFreq(w.id, Number(e.currentTarget.value))}
                      className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <button onClick={() => runCheck(w.id)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    Check
                  </button>
                  <button onClick={() => toggleMute(w.id, w.muted_until)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {w.muted_until ? "Unmute" : "Mute"}
                  </button>
                  <button onClick={() => removeWatch(w.id)} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[12px] font-medium text-red-600 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="text-[12px] text-slate-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              {[["First", () => setPage(1), page === 1], ["Prev", () => setPage((p) => Math.max(1, p - 1)), page === 1], ["Next", () => setPage((p) => Math.min(pages, p + 1)), page === pages], ["Last", () => setPage(pages), page === pages]].map(([label, fn, disabled]: any) => (
                <button key={label as string} onClick={fn} disabled={disabled}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {label as string}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
