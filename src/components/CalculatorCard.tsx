// src/components/CalculatorCard.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCalculator } from "@/components/Calculator/CalculatorContext";

type LegacyTier = { id: string; max: number; mult: number };
type ShippingRule = { id: string; max: number; buffer: number };

type LegacyOptions = {
  tiers: LegacyTier[];
  shippingBuffer: ShippingRule[];
  floor: number;
  bonusFade?: { startCost: number; endCost: number; startPct: number; endPct: number };
  rounding?: "ends_99" | "round_05" | "round_int";
};

type FormulaValue = { type: "legacy"; legacyOptions: LegacyOptions } | null;

type EvalResponse = {
  ok: boolean;
  result?: { ok: boolean; price?: number; error?: string; debug?: any };
  error?: string;
};

function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

/**
 * Small helper to keep a reasonable default legacy options (editable).
 */
const defaultLegacyOptions = (): LegacyOptions => ({
  tiers: [
    { id: uid("t"), max: 5, mult: 3.0 },
    { id: uid("t"), max: 10, mult: 2.75 },
    { id: uid("t"), max: 25, mult: 2.5 },
    { id: uid("t"), max: 50, mult: 2.0 },
    { id: uid("t"), max: 100, mult: 1.75 },
    { id: uid("t"), max: 300, mult: 1.5 },
    { id: uid("t"), max: 500, mult: 1.4 },
    { id: uid("t"), max: 1000, mult: 1.3 },
    { id: uid("t"), max: Number.POSITIVE_INFINITY as any, mult: 1.275 },
  ],
  shippingBuffer: [
    { id: uid("s"), max: 10, buffer: 8 },
    { id: uid("s"), max: 25, buffer: 7 },
    { id: uid("s"), max: 50, buffer: 6 },
  ],
  floor: 14.99,
  bonusFade: { startCost: 0, endCost: 2000, startPct: 0.1, endPct: 0.05 },
  rounding: "ends_99",
});

export default function CalculatorCard({ tenantId }: { tenantId?: string | null }) {
  const ctx = useCalculator();

  const [tab, setTab] = useState<"basic" | "rules">("basic");

  // store formula loaded from server (legacy-only)
  const [storeFormula, setStoreFormula] = useState<FormulaValue | null>(null);
  const [loadingStoreFormula, setLoadingStoreFormula] = useState(false);

  // Local profile override (localStorage)
  const [profileOverrideKey] = useState<string>("price_profile_override");
  const [profileOverride, setProfileOverride] = useState<FormulaValue | null>(null);

  // Source selection (kept local but mirrored to ctx.selectedSource)
  const [selectedSource, setSelectedSource] = useState<"store" | "profile" | "custom">("store");

  // Local editable legacy options (custom/source editor)
  const [legacyOptions, setLegacyOptions] = useState<LegacyOptions>(defaultLegacyOptions);

  // Rule-testing state
  const [testInput, setTestInput] = useState<string>('{"cost": 12}');
  const [testResult, setTestResult] = useState<EvalResponse | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  // Status
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync top-level store formula load
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingStoreFormula(true);
      try {
        const res = await fetch("/api/v1/settings/price-formula");
        const j = await res.json();
        if (mounted && j?.ok && j.value?.type === "legacy") {
          const payload: FormulaValue = { type: "legacy", legacyOptions: j.value.legacyOptions };
          setStoreFormula(payload);
          setLegacyOptions(j.value.legacyOptions);
        } else if (mounted) {
          setStoreFormula(null);
        }
      } catch {
        if (mounted) setStoreFormula(null);
      } finally {
        if (mounted) setLoadingStoreFormula(false);
      }
    }
    load();

    // load profile override from localStorage
    try {
      const raw = localStorage.getItem(profileOverrideKey);
      if (raw) {
        const parsed = JSON.parse(raw) as FormulaValue;
        setProfileOverride(parsed);
      }
    } catch {
      setProfileOverride(null);
    }

    return () => {
      mounted = false;
    };
  }, [profileOverrideKey]);

  // Keep calculator context's selectedSource in sync with local selectedSource
  useEffect(() => {
    ctx.setSelectedSource(selectedSource);
    // ensure context profile override mirrors local
    ctx.setProfileOverrideLocal(profileOverride);
    // sync storeFormula into context if available
    if (storeFormula) {
      ctx.saveStorewide(storeFormula).then(() => {
        /* we use saveStorewide mainly to refresh on server; if you prefer not to call PUT on load, remove this */
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSource, profileOverride, storeFormula]);

  // Helpers to mutate policy structured options
  const updateTier = (id: string, patch: Partial<LegacyTier>) => {
    setLegacyOptions((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  };
  const addTier = (afterId?: string) => {
    setLegacyOptions((prev) => {
      const newTier: LegacyTier = { id: uid("t"), max: 0, mult: 1.0 };
      const idx = prev.tiers.findIndex((t) => t.id === afterId);
      const next = [...prev.tiers];
      if (idx >= 0) next.splice(idx + 1, 0, newTier);
      else next.push(newTier);
      return { ...prev, tiers: next };
    });
  };
  const removeTier = (id: string) => {
    setLegacyOptions((prev) => ({ ...prev, tiers: prev.tiers.filter((t) => t.id !== id) }));
  };

  const updateShipping = (id: string, patch: Partial<ShippingRule>) => {
    setLegacyOptions((prev) => ({ ...prev, shippingBuffer: prev.shippingBuffer.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  };
  const addShipping = (afterId?: string) => {
    setLegacyOptions((prev) => {
      const newRow: ShippingRule = { id: uid("s"), max: 0, buffer: 0 };
      const idx = prev.shippingBuffer.findIndex((s) => s.id === afterId);
      const next = [...prev.shippingBuffer];
      if (idx >= 0) next.splice(idx + 1, 0, newRow);
      else next.push(newRow);
      return { ...prev, shippingBuffer: next };
    });
  };
  const removeShipping = (id: string) => {
    setLegacyOptions((prev) => ({ ...prev, shippingBuffer: prev.shippingBuffer.filter((s) => s.id !== id) }));
  };

  // Build payload for evaluate API based on selected source
  const activeFormula = useMemo<FormulaValue>(() => {
    if (selectedSource === "store") return storeFormula;
    if (selectedSource === "profile") return profileOverride ?? null;
    return { type: "legacy", legacyOptions };
  }, [selectedSource, storeFormula, profileOverride, legacyOptions]);

  async function runEvaluate(payloadFormula: FormulaValue | null, inputObj: any) {
    setEvaluating(true);
    setTestResult(null);
    setStatusMessage(null);
    try {
      const body: any = { input: inputObj };
      if (payloadFormula) body.formula = payloadFormula;
      // Use context evaluate so lastResult stays in sync across UI
      const res = await ctx.evaluate(inputObj, payloadFormula ?? undefined);
      setTestResult(res);
      return res as EvalResponse;
    } catch (err: any) {
      const e: EvalResponse = { ok: false, error: String(err?.message ?? err) };
      setTestResult(e);
      return e;
    } finally {
      setEvaluating(false);
    }
  }

  async function handleTest() {
    let inputObj: any = {};
    try {
      inputObj = JSON.parse(testInput || "{}");
    } catch {
      setStatusMessage("Invalid JSON for test input");
      return;
    }
    await runEvaluate(activeFormula, inputObj);
  }

  // Save profile override locally (non-destructive)
  function saveProfileOverrideLocal() {
    try {
      const payload: FormulaValue = { type: "legacy", legacyOptions };
      localStorage.setItem(profileOverrideKey, JSON.stringify(payload));
      setProfileOverride(payload);
      setSelectedSource("profile");
      ctx.setProfileOverrideLocal(payload);
      setStatusMessage("Profile override saved locally (this browser).");
    } catch {
      setStatusMessage("Failed to save profile override locally.");
    }
  }

  // Save storewide (admin) — uses context.saveStorewide
  async function saveStorewide() {
    const payload: FormulaValue = { type: "legacy", legacyOptions: normalizeTiers(legacyOptions) };
    const r = await ctx.saveStorewide(payload);
    if (r.ok) {
      setStoreFormula(payload);
      setStatusMessage("Saved storewide formula.");
    } else {
      setStatusMessage("Failed to save storewide formula.");
    }
  }

  // Basic compute uses context.computeActive
  async function handleBasicCompute() {
    const cost = Number(ctx.basicValue) || 0;
    await ctx.computeActive({ cost });
  }

  // Simple UI helpers
  const smallBtn = (label: string, cb?: () => void, disabled?: boolean) => (
    <button
      type="button"
      onClick={cb}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  );

  // Validation: ensure tiers sorted by max ascending before sending storewide
  function normalizeTiers(opts: LegacyOptions): LegacyOptions {
    const copy = { ...opts, tiers: [...opts.tiers] };
    copy.tiers.sort((a, b) => {
      const aMax = Number.isFinite(a.max) ? a.max : Number.POSITIVE_INFINITY;
      const bMax = Number.isFinite(b.max) ? b.max : Number.POSITIVE_INFINITY;
      return aMax - bMax;
    });
    return copy;
  }

  // UI: show shared last result by default in Basic; show rule-test result in Test area
  const lastResult = ctx.lastResult;
  const shownResult = tab === "basic" ? lastResult : testResult;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">Calculator</h3>
          <p className="text-xs text-slate-500">Structured rule builder — no code required</p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button onClick={() => setTab("basic")} className={`px-3 py-1 rounded-md ${tab === "basic" ? "bg-slate-100" : "bg-transparent"}`}>
            Basic
          </button>
          <button onClick={() => setTab("rules")} className={`px-3 py-1 rounded-md ${tab === "rules" ? "bg-slate-100" : "bg-transparent"}`}>
            Rules
          </button>
        </div>
      </div>

      {/* Source selector */}
      <div className="mb-3 text-sm">
        <label className="block text-xs text-slate-500 mb-1">Formula source</label>
        <div className="flex gap-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={selectedSource === "store"} onChange={() => setSelectedSource("store")} />
            Use storewide formula
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={selectedSource === "profile"} onChange={() => setSelectedSource("profile")} />
            Use profile override (local)
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="radio" checked={selectedSource === "custom"} onChange={() => setSelectedSource("custom")} />
            Use custom rules (editor)
          </label>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          <div>
            Active:{" "}
            {selectedSource === "store"
              ? storeFormula
                ? "store (legacy)"
                : "none"
              : selectedSource === "profile"
              ? profileOverride
                ? "profile (legacy)"
                : "none"
              : "custom (legacy)"}
          </div>
        </div>
      </div>

      {/* Basic tab */}
      {tab === "basic" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Value (decimal)</label>
              <input
                type="number"
                step="0.01"
                value={ctx.basicValue as number}
                onChange={(e) => ctx.setBasicValue(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Rounding</label>
              <select value={ctx.basicRounding} onChange={(e) => ctx.setBasicRounding(e.target.value)} className="w-full rounded-md border px-3 py-2">
                <option value="ends_99">Ends .99</option>
                <option value="round_05">Round to .05</option>
                <option value="round_int">Round to integer</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={ctx.includeShippingBuffer} onChange={(e) => ctx.setIncludeShippingBuffer(e.target.checked)} />
              Include shipping buffer
            </label>

            {smallBtn("Compute", async () => {
              try {
                await handleBasicCompute();
              } catch {
                setStatusMessage("Compute failed");
              }
            })}
            {smallBtn("Approve", () => setStatusMessage("Approve action (not implemented)"))}
            {smallBtn("Push to store", () => setStatusMessage("Push to store (not implemented)"))}
          </div>

          {shownResult && (
            <div className="mt-3 bg-slate-50 p-3 rounded-md text-sm">
              <div>Result:</div>
              <pre className="text-xs mt-1">{JSON.stringify(shownResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* Rules editor (structured) */}
      {tab === "rules" && (
        <div className="space-y-4">
          {/* Tiers */}
          <div className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Tiered multipliers</h4>
              <div className="flex gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-md border bg-white px-2 py-1 text-xs"
                  onClick={() => {
                    addTier();
                  }}
                >
                  + Add tier
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-md border bg-white px-2 py-1 text-xs"
                  onClick={() => {
                    setLegacyOptions(defaultLegacyOptions());
                  }}
                >
                  Reset defaults
                </button>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-600">The table defines a multiplier for cost ranges. Use "Infinity" for the last tier's max.</div>

            <div className="mt-3 space-y-2">
              {legacyOptions.tiers.map((t, idx) => (
                <div key={t.id} className="flex gap-2 items-center">
                  <div className="w-1/3">
                    <label className="text-xs text-slate-500">Max cost</label>
                    <input
                      type="text"
                      value={Number.isFinite(t.max) ? String(t.max) : "Infinity"}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        updateTier(t.id, { max: v.toLowerCase() === "infinity" ? Number.POSITIVE_INFINITY : Number(v === "" ? 0 : Number(v)) });
                      }}
                      className="w-full rounded-md border px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="w-1/3">
                    <label className="text-xs text-slate-500">Multiplier</label>
                    <input type="number" step="0.01" value={t.mult} onChange={(e) => updateTier(t.id, { mult: Number(e.target.value || 0) })} className="w-full rounded-md border px-2 py-1 text-sm" />
                  </div>
                  <div className="flex gap-2 items-end">
                    <button className="text-xs px-2 py-1 rounded border" onClick={() => addTier(t.id)}>
                      Insert
                    </button>
                    <button className="text-xs px-2 py-1 rounded border" onClick={() => removeTier(t.id)}>
                      Remove
                    </button>
                    <div className="text-xs text-slate-400">#{idx + 1}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping buffer */}
          <div className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Shipping buffer rules</h4>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-2 rounded-md border bg-white px-2 py-1 text-xs" onClick={() => addShipping()}>
                  + Add rule
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-600">Applied after multipliers for costs ≤ configured ranges.</div>
            <div className="mt-3 space-y-2">
              {legacyOptions.shippingBuffer.map((s, idx) => (
                <div key={s.id} className="flex gap-2 items-center">
                  <div className="w-1/2">
                    <label className="text-xs text-slate-500">Max cost</label>
                    <input type="number" step="0.01" value={s.max} onChange={(e) => updateShipping(s.id, { max: Number(e.target.value || 0) })} className="w-full rounded-md border px-2 py-1 text-sm" />
                  </div>
                  <div className="w-1/3">
                    <label className="text-xs text-slate-500">Buffer ($)</label>
                    <input type="number" step="0.01" value={s.buffer} onChange={(e) => updateShipping(s.id, { buffer: Number(e.target.value || 0) })} className="w-full rounded-md border px-2 py-1 text-sm" />
                  </div>
                  <div className="flex gap-2 items-end">
                    <button className="text-xs px-2 py-1 rounded border" onClick={() => addShipping(s.id)}>
                      Insert
                    </button>
                    <button className="text-xs px-2 py-1 rounded border" onClick={() => removeShipping(s.id)}>
                      Remove
                    </button>
                    <div className="text-xs text-slate-400">#{idx + 1}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bonus fade & floor */}
          <div className="rounded-md border p-3 grid grid-cols-1 gap-3">
            <div>
              <h4 className="text-sm font-medium">Bonus fade (overlay)</h4>
              <div className="mt-2 text-xs text-slate-600">Defines bonus % that fades from startPct → endPct across the cost range.</div>
              <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                <div>
                  <label className="text-xs text-slate-500">Start cost</label>
                  <input type="number" value={legacyOptions.bonusFade?.startCost ?? 0} onChange={(e) => setLegacyOptions(prev => ({ ...prev, bonusFade: { ...(prev.bonusFade ?? { startCost: 0, endCost: 2000, startPct: 0.1, endPct: 0.05 }), startCost: Number(e.target.value || 0) } }))} className="w-full rounded-md border px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">End cost</label>
                  <input type="number" value={legacyOptions.bonusFade?.endCost ?? 2000} onChange={(e) => setLegacyOptions(prev => ({ ...prev, bonusFade: { ...(prev.bonusFade ?? { startCost: 0, endCost: 2000, startPct: 0.1, endPct: 0.05 }), endCost: Number(e.target.value || 0) } }))} className="w-full rounded-md border px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Start %</label>
                  <input type="number" step="0.01" value={legacyOptions.bonusFade?.startPct ?? 0.1} onChange={(e) => setLegacyOptions(prev => ({ ...prev, bonusFade: { ...(prev.bonusFade ?? { startCost: 0, endCost: 2000, startPct: 0.1, endPct: 0.05 }), startPct: Number(e.target.value || 0) } }))} className="w-full rounded-md border px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">End %</label>
                  <input type="number" step="0.01" value={legacyOptions.bonusFade?.endPct ?? 0.05} onChange={(e) => setLegacyOptions(prev => ({ ...prev, bonusFade: { ...(prev.bonusFade ?? { startCost: 0, endCost: 2000, startPct: 0.1, endPct: 0.05 }), endPct: Number(e.target.value || 0) } }))} className="w-full rounded-md border px-2 py-1 text-sm" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 items-end">
              <div>
                <label className="text-xs text-slate-500">Floor price</label>
                <input type="number" step="0.01" value={legacyOptions.floor} onChange={(e) => setLegacyOptions(prev => ({ ...prev, floor: Number(e.target.value || 0) }))} className="w-36 rounded-md border px-2 py-1 text-sm" />
              </div>

              <div>
                <label className="text-xs text-slate-500">Rounding</label>
                <select value={legacyOptions.rounding} onChange={(e) => setLegacyOptions(prev => ({ ...prev, rounding: e.target.value as LegacyOptions["rounding"] }))} className="rounded-md border px-2 py-1 text-sm">
                  <option value="ends_99">Ends .99</option>
                  <option value="round_05">Round to .05</option>
                  <option value="round_int">Round to integer</option>
                </select>
              </div>

              <div className="ml-auto flex gap-2">
                {smallBtn("Save profile override (local)", saveProfileOverrideLocal)}
                {smallBtn("Save storewide (admin)", async () => {
                  // Normalize tiers before saving
                  const normalized = normalizeTiers(legacyOptions);
                  setLegacyOptions(normalized);
                  await saveStorewide();
                })}
              </div>
            </div>
          </div>

          {/* Test runner and input */}
          <div className="rounded-md border p-3">
            <h4 className="text-sm font-medium">Test pricing</h4>
            <div className="mt-2 text-xs text-slate-600">Provide an item payload (JSON). The active formula (source selector) will be used.</div>

            <label className="block text-xs text-slate-500 mt-3">Test input (JSON)</label>
            <textarea value={testInput} onChange={(e) => setTestInput(e.target.value)} className="w-full min-h-[80px] rounded-md border px-3 py-2 font-mono text-sm" />

            <div className="flex gap-2 mt-2">
              {smallBtn("Run test with active formula", handleTest, evaluating)}
              {smallBtn("Run test with custom rules", async () => {
                const normalized = normalizeTiers(legacyOptions);
                await runEvaluate({ type: "legacy", legacyOptions: normalized }, JSON.parse(testInput || "{}"));
              })}
              {smallBtn("Clear result", () => setTestResult(null))}
            </div>

            {testResult && (
              <div className="mt-3 bg-slate-50 p-3 rounded-md text-sm">
                <div>Result:</div>
                <pre className="text-xs mt-1">{JSON.stringify(testResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global status */}
      <div className="mt-3 text-xs">
        {statusMessage && <div className="text-sm text-amber-700">{statusMessage}</div>}
        {loadingStoreFormula && <div className="text-sm text-slate-500">Loading store formula…</div>}
      </div>
    </div>
  );
}
