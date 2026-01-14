"use client";

import React, { useEffect, useMemo, useState } from "react";

type PriceMode = "monitor" | "suggest" | "auto";

type IngestionRow = {
  id: string;
  tenant_id?: string | null;
  source_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  cost_input?: number | null;
  store_price?: number | null;
  price_mode?: string | null;
  pricing_result?: any | null;
};

type CalcResult = {
  computedPrice: number | null;
  storePrice: number | null;
  currency: string;
  rounding: string;
  capsApplied: string[];
  blocked: boolean;
  blockReason?: string | null;
  warnings: string[];
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatMoney(v: any) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toFixed(2)}`;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function shortId(id: string) {
  if (!id) return "";
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export default function PriceWorkspace() {
  const [loading, setLoading] = useState(true);
  const [ingestions, setIngestions] = useState<IngestionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Editor state (per selected ingestion)
  const [mode, setMode] = useState<PriceMode>("suggest");
  const [cost, setCost] = useState<string>("");

  // Lightweight “inline profile overrides” for MVP
  const [enabled, setEnabled] = useState(true);
  const [profileMode, setProfileMode] = useState<"markup" | "margin">("margin");
  const [value, setValue] = useState<string>("0.22");
  const [rounding, setRounding] = useState<"none" | "nearest_0_05" | "nearest_0_10" | "ends_99">("ends_99");
  const [includeShippingBuffer, setIncludeShippingBuffer] = useState(false);
  const [shippingBuffer, setShippingBuffer] = useState<string>("0");

  const [activeCalcId, setActiveCalcId] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<CalcResult | null>(null);
  const [activeExplain, setActiveExplain] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<any | null>(null);

  const selected = useMemo(
    () => ingestions.find((x) => x.id === selectedId) ?? null,
    [ingestions, selectedId]
  );

  async function loadIngestions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/price/ingestions?limit=25");
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error ?? "Failed to load ingestions");
      const rows: IngestionRow[] = j.ingestions ?? [];
      setIngestions(rows);

      // Auto-select first row on first load
      if (!selectedId && rows.length) setSelectedId(rows[0].id);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setIngestions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIngestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When selection changes, hydrate editor defaults from row if present
  useEffect(() => {
    if (!selected) return;
    setActiveCalcId(null);
    setActiveResult(null);
    setActiveExplain(null);
    setHistory(null);
    setHistoryOpen(false);

    const rowMode = (selected.price_mode as any) as PriceMode | null;
    if (rowMode && ["monitor", "suggest", "auto"].includes(rowMode)) setMode(rowMode);
    else setMode("suggest");

    if (selected.cost_input != null && Number.isFinite(Number(selected.cost_input))) {
      setCost(String(selected.cost_input));
    } else {
      setCost("");
    }
  }, [selected?.id]); // intentional

  async function compute() {
    if (!selected) return;
    setError(null);
    setActiveCalcId(null);
    setActiveResult(null);
    setActiveExplain(null);

    try {
      const body = {
        ingestionId: selected.id,
        mode,
        source: "ui",
        input: {
          cost: cost === "" ? null : Number(cost),
          currency: "USD",
        },
        profile: {
          enabled,
          mode: profileMode,
          value: value === "" ? 0 : Number(value),
          rounding,
          include_shipping_buffer: includeShippingBuffer,
          shipping_buffer: shippingBuffer === "" ? 0 : Number(shippingBuffer),
        },
      };

      const res = await fetch("/api/v1/price/compute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error ?? "Compute failed");

      setActiveCalcId(j.calcId ?? null);
      setActiveResult(j.pricingResult ?? null);
      setActiveExplain(j.explain ?? null);

      // Refresh list so row shows updated pricing_result/store_price if server wrote it
      await loadIngestions();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  async function approve() {
    if (!activeCalcId) return;
    setError(null);
    try {
      const res = await fetch("/api/v1/price/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ calcId: activeCalcId }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error ?? "Approve failed");
      await loadIngestions();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  async function push() {
    if (!activeCalcId) return;
    setError(null);
    try {
      const res = await fetch("/api/v1/price/push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ calcId: activeCalcId }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error ?? "Push failed");
      await loadIngestions();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  async function openHistory() {
    if (!selected) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/v1/price/history?ingestionId=${encodeURIComponent(selected.id)}`);
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error ?? "Failed to load history");
      setHistory(j);
    } catch (e: any) {
      setHistory({ ok: false, error: String(e?.message ?? e) });
    } finally {
      setHistoryLoading(false);
    }
  }

  const rightStatus = useMemo(() => {
    const pr = selected?.pricing_result;
    const blocked = Boolean(pr?.blocked);
    const hasStorePrice = selected?.store_price != null && Number.isFinite(Number(selected.store_price));
    if (blocked) return { label: "Blocked", tone: "rose" as const };
    if (hasStorePrice) return { label: "Approved", tone: "emerald" as const };
    if (pr && pr.storePrice != null) return { label: "Computed", tone: "sky" as const };
    return { label: "Not computed", tone: "slate" as const };
  }, [selected]);

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      {/* LEFT: ingestion list */}
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_16px_40px_rgba(148,163,184,0.25)] dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_16px_40px_rgba(15,23,42,0.7)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Pricing workspace
            </div>
            <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
              Recent ingestions
            </h2>
          </div>

          <button
            onClick={loadIngestions}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            type="button"
          >
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-900 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="mt-4">
          {loading ? (
            <div className="text-sm text-slate-600 dark:text-slate-300">Loading…</div>
          ) : ingestions.length === 0 ? (
            <div className="text-sm text-slate-600 dark:text-slate-300">No ingestions found yet.</div>
          ) : (
            <div className="space-y-2">
              {ingestions.map((row) => {
                const isActive = row.id === selectedId;
                const pr = row.pricing_result;
                const blocked = Boolean(pr?.blocked);
                const computed = pr?.storePrice != null && Number.isFinite(Number(pr.storePrice));
                const approved = row.store_price != null && Number.isFinite(Number(row.store_price));

                const pill = approved
                  ? { text: "approved", cls: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/25 dark:text-emerald-200" }
                  : blocked
                  ? { text: "blocked", cls: "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/25 dark:text-rose-200" }
                  : computed
                  ? { text: "computed", cls: "bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-500/10 dark:border-sky-500/25 dark:text-sky-200" }
                  : { text: "new", cls: "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-200" };

                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={cx(
                      "w-full text-left rounded-xl border px-3 py-3 transition",
                      isActive
                        ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-500/10"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-900/60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-50">
                          {row.source_url ? row.source_url : shortId(row.id)}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                          <span>ID {shortId(row.id)}</span>
                          {row.created_at ? <span>· {formatDate(row.created_at)}</span> : null}
                          {row.cost_input != null ? <span>· cost {formatMoney(row.cost_input)}</span> : null}
                        </div>
                      </div>

                      <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", pill.cls)}>
                        {pill.text}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-700 dark:text-slate-200">
                      <span className="text-slate-500 dark:text-slate-400">store:</span>
                      <span className="font-semibold">{formatMoney(row.store_price ?? pr?.storePrice)}</span>
                      {pr?.warnings?.length ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                          warnings {pr.warnings.length}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: calculator */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_16px_40px_rgba(148,163,184,0.25)] dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_16px_40px_rgba(15,23,42,0.7)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Calculator
              </div>
              <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                {selected ? "Compute & enforce price" : "Select an ingestion"}
              </h3>
              {selected?.source_url ? (
                <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 break-all">
                  {selected.source_url}
                </div>
              ) : null}
            </div>

            <span
              className={cx(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold",
                rightStatus.tone === "emerald" && "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200",
                rightStatus.tone === "rose" && "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200",
                rightStatus.tone === "sky" && "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200",
                rightStatus.tone === "slate" && "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200"
              )}
            >
              {rightStatus.label}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Mode</div>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as PriceMode)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                disabled={!selected}
              >
                <option value="monitor">monitor</option>
                <option value="suggest">suggest</option>
                <option value="auto">auto</option>
              </select>
            </label>

            <label className="space-y-1">
              <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Cost</div>
              <input
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 82.00"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                disabled={!selected}
                inputMode="decimal"
              />
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Profile overrides (MVP)
              </div>
              <label className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-200">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} disabled={!selected} />
                Enabled
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Formula</div>
                <select
                  value={profileMode}
                  onChange={(e) => setProfileMode(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                  disabled={!selected}
                >
                  <option value="margin">margin</option>
                  <option value="markup">markup</option>
                </select>
              </label>

              <label className="space-y-1">
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Value (decimal)
                </div>
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0.22"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                  disabled={!selected}
                  inputMode="decimal"
                />
              </label>

              <label className="space-y-1">
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Rounding</div>
                <select
                  value={rounding}
                  onChange={(e) => setRounding(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                  disabled={!selected}
                >
                  <option value="none">none</option>
                  <option value="nearest_0_05">nearest_0_05</option>
                  <option value="nearest_0_10">nearest_0_10</option>
                  <option value="ends_99">ends_99</option>
                </select>
              </label>

              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Shipping buffer</div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={includeShippingBuffer}
                      onChange={(e) => setIncludeShippingBuffer(e.target.checked)}
                      disabled={!selected}
                    />
                    Include
                  </label>
                  <input
                    value={shippingBuffer}
                    onChange={(e) => setShippingBuffer(e.target.value)}
                    placeholder="0"
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                    disabled={!selected || !includeShippingBuffer}
                    inputMode="decimal"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={compute}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(16,185,129,0.40)] hover:bg-emerald-400 disabled:opacity-50"
              disabled={!selected}
              type="button"
            >
              Compute
            </button>

            <button
              onClick={approve}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
              disabled={!selected || !activeCalcId || Boolean(activeResult?.blocked)}
              type="button"
            >
              Approve
            </button>

            <button
              onClick={push}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
              disabled={!selected || !activeCalcId || Boolean(activeResult?.blocked)}
              type="button"
            >
              Push to store
            </button>

            <button
              onClick={openHistory}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              disabled={!selected}
              type="button"
            >
              History
            </button>
          </div>

          {/* Result preview */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Latest compute
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Computed</div>
                <div className="font-semibold text-slate-900 dark:text-slate-50">
                  {formatMoney(activeResult?.computedPrice)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">Store price</div>
                <div className="font-semibold text-slate-900 dark:text-slate-50">
                  {formatMoney(activeResult?.storePrice)}
                </div>
              </div>
            </div>

            {activeResult?.blocked ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-900 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
                Blocked: {activeResult.blockReason ?? "unknown"}
              </div>
            ) : null}

            {activeExplain ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  Explain
                </summary>
                <pre className="mt-2 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-[10px] text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  {activeExplain}
                </pre>
              </details>
            ) : (
              <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Run compute to generate an explanation trail.
              </div>
            )}
          </div>
        </div>

        {/* History drawer */}
        {historyOpen ? (
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 dark:border-slate-800 dark:bg-slate-900/85">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Price history
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                type="button"
              >
                Close
              </button>
            </div>

            {historyLoading ? (
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">Loading…</div>
            ) : (
              <pre className="mt-3 max-h-[340px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-[10px] text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
                {JSON.stringify(history, null, 2)}
              </pre>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
