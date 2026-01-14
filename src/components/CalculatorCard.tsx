// src/components/CalculatorCard.tsx
"use client";

import React, { useEffect, useState } from "react";

type FormulaValue =
  | { type: "js"; code: string }
  | { type: "legacy"; legacyOptions: any }
  | null;

type EvalResponse = {
  ok: boolean;
  result?: { ok: boolean; price?: number; error?: string; debug?: any };
  error?: string;
};

export default function CalculatorCard({ tenantId }: { tenantId?: string | null }) {
  const [tab, setTab] = useState<"basic" | "advanced" | "legacy">("basic");

  // Data sources: storewide (from API), profile override (localStorage), custom (editor)
  const [storeFormula, setStoreFormula] = useState<FormulaValue | null>(null);
  const [loadingStoreFormula, setLoadingStoreFormula] = useState(false);

  const [profileOverrideKey, setProfileOverrideKey] = useState<string | null>(null);
  const [profileOverride, setProfileOverride] = useState<FormulaValue | null>(null);

  const [selectedSource, setSelectedSource] = useState<"store" | "profile" | "custom">("store");

  // Advanced editor
  const [editingCode, setEditingCode] = useState<string>(`// Example: define calculatePrice(input) and return a number\nfunction calculatePrice(input){\n  const cost = Number(input.cost || 0);\n  // trivial markup\n  return Math.round((cost * 2 + 0.99) * 100) / 100;\n}`);

  // Legacy options (JSON editor for structured legacy engine)
  const defaultLegacy = {
    tiers: [
      { max: 5, mult: 3.0 },
      { max: 10, mult: 2.75 },
      { max: 25, mult: 2.5 },
      { max: 50, mult: 2.0 },
      { max: 100, mult: 1.75 },
    ],
    shippingBuffer: [
      { max: 10, buffer: 8 },
      { max: 25, buffer: 7 },
      { max: 50, buffer: 6 },
    ],
    floor: 14.99,
  };
  const [legacyJson, setLegacyJson] = useState<string>(JSON.stringify(defaultLegacy, null, 2));

  // UI test input + result
  const [testInput, setTestInput] = useState<string>('{"cost": 12}');
  const [testResult, setTestResult] = useState<EvalResponse | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  // Basic controls
  const [basicValue, setBasicValue] = useState<number | "">(0.22);
  const [basicRounding, setBasicRounding] = useState<string>("ends_99");
  const [shippingBufferToggle, setShippingBufferToggle] = useState<boolean>(false);

  // warnings / info
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load store formula on mount
  useEffect(() => {
    async function load() {
      setLoadingStoreFormula(true);
      try {
        const res = await fetch("/api/v1/settings/price-formula");
        const j = await res.json();
        if (j?.ok) {
          setStoreFormula(j.value ?? null);
          // prefill editors from stored value if present
          if (j.value?.type === "js" && j.value?.code) setEditingCode(j.value.code);
          if (j.value?.type === "legacy" && j.value?.legacyOptions) {
            setLegacyJson(JSON.stringify(j.value.legacyOptions, null, 2));
          }
        } else {
          setStoreFormula(null);
        }
      } catch (e) {
        setStatusMessage("Failed to load store formula");
      } finally {
        setLoadingStoreFormula(false);
      }
    }
    load();

    // load profile override from localStorage (MVP)
    const key = "price_profile_override";
    setProfileOverrideKey(key);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        // parse and cast to FormulaValue
        const parsed = JSON.parse(raw) as FormulaValue;
        setProfileOverride(parsed);
      }
    } catch {
      setProfileOverride(null);
    }
  }, []);

  // Helpers
  function getActiveFormula(): FormulaValue {
    if (selectedSource === "store") return storeFormula;
    if (selectedSource === "profile") return profileOverride ?? null;
    // custom
    return { type: "js", code: editingCode };
  }

  async function runEvaluateAgainst(formula: FormulaValue, inputObj: any) {
    setEvaluating(true);
    setTestResult(null);
    try {
      // If using legacy structured, call API with { type: "legacy", legacyOptions }
      const payload: any = { input: inputObj };
      if (formula) payload.formula = formula;
      const res = await fetch("/api/v1/price/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      setTestResult(j);
      return j as EvalResponse;
    } catch (err: any) {
      const e: EvalResponse = { ok: false, error: String(err?.message ?? err) };
      setTestResult(e);
      return e;
    } finally {
      setEvaluating(false);
    }
  }

  async function handleTest() {
    setStatusMessage(null);
    let inputObj = {};
    try {
      inputObj = JSON.parse(testInput || "{}");
    } catch {
      setStatusMessage("Invalid JSON for test input");
      return;
    }

    const formula = getActiveFormula();
    if (!formula) {
      // If no formula selected, attempt server storewide evaluation (evaluate route loads store formula)
      setEvaluating(true);
      try {
        const res = await fetch("/api/v1/price/evaluate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ input: inputObj }),
        });
        const j = await res.json();
        setTestResult(j);
      } catch (e: any) {
        setTestResult({ ok: false, error: String(e?.message ?? e) });
      } finally {
        setEvaluating(false);
      }
      return;
    }

    // If legacy type but we only have JSON legacyOptions in editor, build that payload
    if ((formula as any).type === "legacy" && (formula as any).legacyOptions == null) {
      // Try parse legacyJson
      try {
        const parsed = JSON.parse(legacyJson);
        await runEvaluateAgainst({ type: "legacy", legacyOptions: parsed }, inputObj);
      } catch {
        setStatusMessage("Invalid legacy JSON options");
      }
      return;
    }

    await runEvaluateAgainst(formula, inputObj);
  }

  // Save profile override to localStorage (MVP; non-destructive)
  function saveProfileOverrideLocal() {
    const key = profileOverrideKey ?? "price_profile_override";
    const value: FormulaValue = selectedSource === "custom" ? { type: "js", code: editingCode } : storeFormula;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setProfileOverride(value);
      setStatusMessage("Profile override saved locally (only on this browser).");
    } catch {
      setStatusMessage("Failed to save profile override.");
    }
  }

  // Save storewide formula (this writes to DB via PUT). Admin-only in production.
  async function saveStorewideFormula() {
    const value = selectedSource === "custom" ? ({ type: "js", code: editingCode } as FormulaValue) : selectedSource === "profile" ? profileOverride : storeFormula;
    if (!value) {
      setStatusMessage("No formula to save");
      return;
    }
    // WARNING: this will perform a write. Only proceed if you intend to change storewide formula.
    try {
      const res = await fetch("/api/v1/settings/price-formula", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId: tenantId ?? null, value }),
      });
      const j = await res.json();
      if (j?.ok) {
        setStoreFormula(j.data?.value ?? value);
        setStatusMessage("Saved storewide formula (requires admin permissions).");
      } else {
        setStatusMessage("Failed to save storewide formula: " + (j?.error ?? JSON.stringify(j)));
      }
    } catch (e: any) {
      setStatusMessage("Error saving formula: " + String(e?.message ?? e));
    }
  }

  // Helper UI bits
  function smallBtn(label: string, onClick?: () => void, disabled?: boolean) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {label}
      </button>
    );
  }

  // Build the UI
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">Calculator</h3>
          <p className="text-xs text-slate-500">Compute & enforce price (Profile overrides available)</p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setTab("basic")}
            className={`px-3 py-1 rounded-md ${tab === "basic" ? "bg-slate-100" : "bg-transparent"}`}
          >
            Basic
          </button>
          <button
            onClick={() => setTab("advanced")}
            className={`px-3 py-1 rounded-md ${tab === "advanced" ? "bg-slate-100" : "bg-transparent"}`}
          >
            Advanced
          </button>
          <button
            onClick={() => setTab("legacy")}
            className={`px-3 py-1 rounded-md ${tab === "legacy" ? "bg-slate-100" : "bg-transparent"}`}
          >
            Legacy
          </button>
        </div>
      </div>

      {/* source selector */}
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
            Use custom formula (editor)
          </label>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          <div>Active: {selectedSource === "store" ? (storeFormula ? `store (${storeFormula.type})` : "none") : selectedSource === "profile" ? (profileOverride ? `profile (${profileOverride.type})` : "none") : `custom (js)`}</div>
        </div>
      </div>

      {tab === "basic" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Value (decimal)</label>
              <input
                type="number"
                step="0.01"
                value={basicValue as number}
                onChange={(e) => setBasicValue(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-md border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Rounding</label>
              <select value={basicRounding} onChange={(e) => setBasicRounding(e.target.value)} className="w-full rounded-md border px-3 py-2">
                <option value="ends_99">Ends .99</option>
                <option value="round_05">Round to .05</option>
                <option value="round_int">Round to integer</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={shippingBufferToggle} onChange={(e) => setShippingBufferToggle(e.target.checked)} />
              Include shipping buffer
            </label>

            {smallBtn("Compute", async () => {
              // Evaluate using the active formula if any, otherwise do a simple multiply
              let inputObj = { cost: Number(basicValue) || 0 };
              try {
                const formula = getActiveFormula();
                if (formula) {
                  await runEvaluateAgainst(formula, inputObj);
                } else {
                  // fallback simple compute
                  const price = Number(basicValue) * 1.5;
                  setTestResult({ ok: true, result: { ok: true, price } });
                }
              } catch (e) {
                setStatusMessage("Compute failed");
              }
            })}
            {smallBtn("Approve", () => setStatusMessage("Approve action (not implemented)"))}
            {smallBtn("Push to store", () => setStatusMessage("Push to store (not implemented)"))}
          </div>

          {testResult && (
            <div className="mt-3 bg-slate-50 p-3 rounded-md text-sm">
              <div>Result:</div>
              <pre className="text-xs mt-1">{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {tab === "advanced" && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">JS formula editor</label>
            <textarea value={editingCode} onChange={(e) => setEditingCode(e.target.value)} className="w-full min-h-[180px] rounded-md border px-3 py-2 font-mono text-sm" />
            <p className="text-xs text-slate-400 mt-1">
              The function must define calculatePrice(input) and return a finite number. Use sanitizeMoneyG(input.cost) if needed.
            </p>
          </div>

          <div className="flex gap-2">
            {smallBtn("Test formula", handleTest, evaluating)}
            {smallBtn("Save as profile override (local)", () => {
              setSelectedSource("profile");
              // Save local
              try {
                const value: FormulaValue = { type: "js", code: editingCode };
                const key = profileOverrideKey ?? "price_profile_override";
                localStorage.setItem(key, JSON.stringify(value));
                setProfileOverride(value);
                setStatusMessage("Saved profile override locally.");
              } catch {
                setStatusMessage("Failed to save profile override.");
              }
            })}
            {smallBtn("Save as storewide (admin)", saveStorewideFormula)}
          </div>

          {testResult && (
            <div className="mt-3 bg-slate-50 p-3 rounded-md text-sm">
              <div>Result:</div>
              <pre className="text-xs mt-1">{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}

          <div className="mt-2 text-xs text-slate-500">
            <strong>Note:</strong> Saving a storewide formula will write to the settings table and requires proper permissions. Use profile override for local experiments.
          </div>
        </div>
      )}

      {tab === "legacy" && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Legacy options (JSON)</label>
            <textarea value={legacyJson} onChange={(e) => setLegacyJson(e.target.value)} className="w-full min-h-[150px] rounded-md border px-3 py-2 font-mono text-sm" />
            <p className="text-xs text-slate-400 mt-1">Structured options for legacy tiered pricing engine (tiers, shippingBuffer, floor).</p>
          </div>

          <div className="flex gap-2">
            {smallBtn("Test legacy engine", async () => {
              // build formula payload
              try {
                const parsed = JSON.parse(legacyJson);
                await runEvaluateAgainst({ type: "legacy", legacyOptions: parsed }, JSON.parse(testInput || "{}"));
              } catch {
                setStatusMessage("Invalid legacy JSON");
              }
            })}
            {smallBtn("Save legacy as storewide (admin)", async () => {
              try {
                const parsed = JSON.parse(legacyJson);
                const payload = { type: "legacy", legacyOptions: parsed } as FormulaValue;
                // Save storewide via API
                const res = await fetch("/api/v1/settings/price-formula", {
                  method: "PUT",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ tenantId: tenantId ?? null, value: payload }),
                });
                const j = await res.json();
                if (j?.ok) {
                  setStoreFormula(j.data?.value ?? payload);
                  setStatusMessage("Legacy formula saved as storewide (admin).");
                } else {
                  setStatusMessage("Failed to save legacy formula");
                }
              } catch {
                setStatusMessage("Invalid legacy JSON");
              }
            })}
          </div>

          {testResult && (
            <div className="mt-3 bg-slate-50 p-3 rounded-md text-sm">
              <div>Result:</div>
              <pre className="text-xs mt-1">{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* Test input area (shared) */}
      <div className="mt-4">
        <label className="block text-xs text-slate-500 mb-1">Test input (JSON)</label>
        <textarea value={testInput} onChange={(e) => setTestInput(e.target.value)} className="w-full min-h-[80px] rounded-md border px-3 py-2 font-mono text-sm" />
        <div className="flex gap-2 mt-2">
          {smallBtn("Run test with active formula", handleTest, evaluating)}
          {smallBtn("Clear result", () => setTestResult(null))}
        </div>
      </div>

      {/* Status and debug */}
      <div className="mt-3 text-xs">
        {statusMessage && <div className="text-sm text-amber-700">{statusMessage}</div>}
        {loadingStoreFormula && <div className="text-sm text-slate-500">Loading store formula…</div>}
      </div>
    </div>
  );
}
