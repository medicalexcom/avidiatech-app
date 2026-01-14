"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCalculator } from "@/components/Calculator/CalculatorContext";

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
    return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return String(value);
  }
}
function shortId(id: string) {
  if (!id) return "";
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export default function PriceWorkspace() {
  const ctx = useCalculator();

  const [loading, setLoading] = useState(true);
  const [ingestions, setIngestions] = useState<IngestionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Editor state (per selected ingestion)
  const [mode, setMode] = useState<PriceMode>("suggest");
  const [cost, setCost] = useState<string>("");

  // Lightweight inline profile overrides (kept local for mode type)
  const [enabled, setEnabled] = useState(true);
  const [profileMode, setProfileMode] = useState<"markup" | "margin">("margin");

  const [activeCalcId, setActiveCalcId] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<CalcResult | null>(null);
  const [activeExplain, setActiveExplain] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<any | null>(null);

  const selected = useMemo(() => ingestions.find((x) => x.id === selectedId) ?? null, [ingestions, selectedId]);

  async function loadIngestions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/price/ingestions?limit=25");
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error ?? "Failed to load ingestions");
      const rows: IngestionRow[] = j.ingestions ?? [];
      setIngestions(rows);
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

  // Hydrate editor defaults from selected row
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
      // set local cost but also reflect shared basic value (so top calculator matches)
      setCost(String(selected.cost_input));
      ctx.setBasicValue(Number(selected.cost_input));
    } else {
      setCost("");
    }
    // When a new ingestion is selected, show compact right widget (it renders only when selected)
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
          cost: cost === "" ? (Number(ctx.basicValue) || null) : Number(cost),
          currency: "USD",
        },
        profile: {
          enabled,
          mode: profileMode,
          // use shared basic value (reflects full-width calculator)
          value: Number(ctx.basicValue) || 0,
          rounding: ctx.basicRounding ?? "ends_99",
          include_shipping_buffer: Boolean(ctx.includeShippingBuffer),
          shipping_buffer: Number(ctx.includeShippingBuffer ? (ctx.basicValue ? 0 : 0) : 0), // keep existing shipping input if you want
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
      {/* LEFT: ingestion list (unchanged) */}
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_16px_40px_rgba(148,163,184,0.25)] dark:border-slate-800 dark:bg-slate-900/85">
        {/* header and list rendering unchanged (omitted here for brevity) */}
        {/* (use the original left column content from your file) */}
        {/* ... */}
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
                        <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-50">{row.source_url ? row.source_url : shortId(row.id)}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                          <span>ID {shortId(row.id)}</span>
                          {row.created_at ? <span>· {formatDate(row.created_at)}</span> : null}
                          {row.cost_input != null ? <span>· cost {formatMoney(row.cost_input)}</span> : null}
                        </div>
                      </div>

                      <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", pill.cls)}>{pill.text}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-700 dark:text-slate-200">
                      <span className="text-slate-500 dark:text-slate-400">store:</span>
                      <span className="font-semibold">{formatMoney(row.store_price ?? pr?.storePrice)}</span>
                      {pr?.warnings?.length ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">warnings {pr.warnings.length}</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: compact status + controls (only render when an ingestion is selected) */}
      <div className="space-y-4">
        {selected ? (
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_16px_40px_rgba(148,163,184,0.12)] dark:border-slate-800 dark:bg-slate-900/85" style={{ position: "sticky", top: 20 }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Calculator</div>
                <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">Quick compute</h3>
                {selected?.source_url ? <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 break-all">{selected.source_url}</div> : null}
              </div>

              <span className={cx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold", rightStatus.tone === "emerald" && "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200", rightStatus.tone === "rose" && "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200", rightStatus.tone === "sky" && "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200", rightStatus.tone === "slate" && "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200")}>
                {rightStatus.label}
              </span>
            </div>

            {/* Compact controls use shared basic values from CalculatorProvider */}
            <div className="mt-3 grid grid-cols-1 gap-3">
              <label className="space-y-1 text-xs">
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Mode</div>
                <select value={mode} onChange={(e) => setMode(e.target.value as PriceMode)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
                  <option value="monitor">monitor</option>
                  <option value="suggest">suggest</option>
                  <option value="auto">auto</option>
                </select>
              </label>

              <label className="space-y-1 text-xs">
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Cost</div>
                <input value={cost || String(ctx.basicValue || "")} onChange={(e) => { setCost(e.target.value); ctx.setBasicValue(e.target.value === "" ? "" : Number(e.target.value)); }} placeholder="e.g. 82.00" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" inputMode="decimal" />
              </label>
            </div>

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Profile overrides</div>
                <label className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-200">
                  <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                  Enabled
                </label>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3">
                <label className="space-y-1 text-xs">
                  <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Formula</div>
                  <select value={profileMode} onChange={(e) => setProfileMode(e.target.value as any)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
                    <option value="margin">margin</option>
                    <option value="markup">markup</option>
                  </select>
                </label>

                <label className="space-y-1 text-xs">
                  <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Value (decimal)</div>
                  <input value={String(ctx.basicValue ?? "")} onChange={(e) => ctx.setBasicValue(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0.22" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" inputMode="decimal" />
                </label>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-200">
                    <input type="checkbox" checked={ctx.includeShippingBuffer} onChange={(e) => ctx.setIncludeShippingBuffer(e.target.checked)} />
                    Include shipping buffer
                  </label>
                  <input value={String(0)} onChange={() => {}} placeholder="0" className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" inputMode="decimal" disabled />
                </div>

                <label className="space-y-1 text-xs">
                  <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Rounding</div>
                  <select value={ctx.basicRounding} onChange={(e) => ctx.setBasicRounding(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
                    <option value="none">none</option>
                    <option value="nearest_0_05">nearest_0_05</option>
                    <option value="nearest_0_10">nearest_0_10</option>
                    <option value="ends_99">ends_99</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={compute} className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(16,185,129,0.40)] hover:bg-emerald-600" type="button">
                Compute
              </button>

              <button onClick={approve} className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm" disabled={!activeCalcId || Boolean(activeResult?.blocked)} type="button">
                Approve
              </button>

              <button onClick={push} className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm" disabled={!activeCalcId || Boolean(activeResult?.blocked)} type="button">
                Push to store
              </button>

              <button onClick={openHistory} className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" type="button">
                History
              </button>
            </div>

            {/* Compact latest preview */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Latest compute</div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Computed</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-50">{formatMoney(activeResult?.computedPrice)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Store price</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-50">{formatMoney(activeResult?.storePrice)}</div>
                </div>
              </div>

              {activeResult?.blocked ? <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-900 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">Blocked: {activeResult.blockReason ?? "unknown"}</div> : null}

              {activeExplain ? <details className="mt-3"><summary className="cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-slate-200">Explain</summary><pre className="mt-2 overflow-auto rounded-lg border border-slate-200 bg-white p-2 text-[10px] text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">{activeExplain}</pre></details> : <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Run compute to generate an explanation trail.</div>}
            </div>
          </div>
        ) : (
          // when nothing is selected we show a small placeholder (so right column doesn't feel empty)
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-600">Select an ingestion to open quick compute</div>
        )}
      </div>
    </section>
  );
}
