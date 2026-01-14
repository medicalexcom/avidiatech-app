// src/components/CalculatorCard.tsx
"use client";
import React, { useEffect, useState } from "react";

type FormulaValue = {
  type: "js" | "legacy";
  code?: string; // when type==='js'
  legacyOptions?: any; // when legacy
};

export default function CalculatorCard({ tenantId }: { tenantId?: string | null }) {
  const [tab, setTab] = useState<"basic"|"advanced"|"legacy">("basic");
  const [formula, setFormula] = useState<FormulaValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [testInput, setTestInput] = useState<string>('{"cost":12}');
  const [testResult, setTestResult] = useState<any>(null);
  const [editingCode, setEditingCode] = useState<string>(`function calculatePrice(input){ const cost = input.cost; return Math.round(cost*2*100)/100; }`);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/v1/settings/price-formula`);
      const j = await res.json();
      setFormula(j?.value ?? null);
      if (j?.value?.code) setEditingCode(j.value.code);
      setLoading(false);
    }
    load();
  }, []);

  async function saveFormula() {
    setLoading(true);
    const payload = { tenantId: tenantId ?? null, value: formula ?? { type: "js", code: editingCode } };
    const res = await fetch(`/api/v1/settings/price-formula`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const j = await res.json();
    setLoading(false);
    if (j?.ok) setFormula(j.data.value ?? payload.value);
  }

  async function runTest() {
    const input = JSON.parse(testInput || "{}");
    // Call a safe evaluate API (we will create route below) or reuse an endpoint that evaluates
    const res = await fetch("/api/v1/price/evaluate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input, formula: formula ?? { type: "js", code: editingCode } }) });
    const j = await res.json();
    setTestResult(j);
  }

  return (
    <div className="calculator-card">
      <div className="tabs">
        <button onClick={() => setTab("basic")}>Basic</button>
        <button onClick={() => setTab("advanced")}>Advanced</button>
        <button onClick={() => setTab("legacy")}>Legacy</button>
      </div>

      {tab === "basic" && (
        <div>
          <h4>Compute & enforce price</h4>
          <p>Use storewide formula by default. You may edit advanced formula from the Advanced tab.</p>
          <div>
            <label>Value (decimal)</label>
            <input type="number" step="0.01" defaultValue={0.22} />
            {/* Basic UI controls: rounding, shipping buffer toggles, approve/push */}
          </div>
        </div>
      )}

      {tab === "advanced" && (
        <div>
          <h4>Advanced: edit JS formula</h4>
          <textarea value={editingCode} onChange={(e) => setEditingCode(e.target.value)} style={{ width: "100%", minHeight: 200 }} />
          <div>
            <button onClick={() => { setFormula({ type: "js", code: editingCode }); saveFormula(); }}>Save formula</button>
            <button onClick={runTest}>Test input</button>
          </div>
          {testResult && <pre>{JSON.stringify(testResult, null, 2)}</pre>}
        </div>
      )}

      {tab === "legacy" && (
        <div>
          <h4>Legacy tier editor</h4>
          <p>Enter tiered multipliers, shipping buffers, floor price, etc. (UI to build structured JSON)</p>
          {/* For brevity: add form controls to create tiers and shipping buffers.
              On save, set formula to { type: 'legacy', legacyOptions: {...} } and save. */}
        </div>
      )}
    </div>
  );
}
