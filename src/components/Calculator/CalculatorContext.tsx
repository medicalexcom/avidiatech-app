import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * CalculatorContext
 * Shared state and helpers for CalculatorCard (top) and SidebarMiniCalculator (right).
 *
 * - loadStoreFormula() reads /api/v1/settings/price-formula
 * - evaluate(...) calls /api/v1/price/evaluate
 * - computeActive(cost) convenience wrapper for Basic compute
 *
 * Keep this file client-only (used by client components).
 */

type LegacyOptions = any; // same structure as your previous legacyOptions

type FormulaValue = { type: "legacy"; legacyOptions: LegacyOptions } | null;

type EvalResponse = {
  ok: boolean;
  result?: { ok: boolean; price?: number; error?: string; debug?: any };
  error?: string;
};

type CalculatorContextValue = {
  // shared controls (basic)
  basicValue: number | "";
  setBasicValue: (v: number | "") => void;
  basicRounding: string;
  setBasicRounding: (r: string) => void;
  includeShippingBuffer: boolean;
  setIncludeShippingBuffer: (b: boolean) => void;

  // formula sources
  selectedSource: "store" | "profile" | "custom";
  setSelectedSource: (s: "store" | "profile" | "custom") => void;
  storeFormula: FormulaValue | null;
  profileOverride: FormulaValue | null;
  setProfileOverrideLocal: (f: FormulaValue | null) => void;

  // compute / evaluate
  evaluate: (input: any, formula?: FormulaValue) => Promise<EvalResponse>;
  computeActive: (input: any) => Promise<EvalResponse>;

  // last result for UI preview
  lastResult: EvalResponse | null;
  setLastResult: (r: EvalResponse | null) => void;

  // saving storewide
  saveStorewide: (value: FormulaValue | null) => Promise<{ ok: boolean; data?: any; error?: any }>;

  // loading state
  loadingStoreFormula: boolean;
};

const CalculatorContext = createContext<CalculatorContextValue | null>(null);

export function useCalculator() {
  const ctx = useContext(CalculatorContext);
  if (!ctx) throw new Error("useCalculator must be used inside CalculatorProvider");
  return ctx;
}

export function CalculatorProvider({ children, tenantId }: { children: React.ReactNode; tenantId?: string | null }) {
  const [basicValue, setBasicValue] = useState<number | "">("");
  const [basicRounding, setBasicRounding] = useState<string>("ends_99");
  const [includeShippingBuffer, setIncludeShippingBuffer] = useState<boolean>(false);

  const [selectedSource, setSelectedSource] = useState<"store" | "profile" | "custom">("store");
  const [storeFormula, setStoreFormula] = useState<FormulaValue | null>(null);
  const [profileOverride, setProfileOverride] = useState<FormulaValue | null>(null);

  const [lastResult, setLastResult] = useState<EvalResponse | null>(null);
  const [loadingStoreFormula, setLoadingStoreFormula] = useState(false);

  useEffect(() => {
    // load store formula once
    let mounted = true;
    async function load() {
      setLoadingStoreFormula(true);
      try {
        const res = await fetch("/api/v1/settings/price-formula");
        const j = await res.json();
        if (j?.ok) {
          setStoreFormula(j.value ?? null);
        } else {
          setStoreFormula(null);
        }
      } catch {
        setStoreFormula(null);
      } finally {
        if (mounted) setLoadingStoreFormula(false);
      }
    }
    load();
    // load local profile override
    try {
      const raw = localStorage.getItem("price_profile_override");
      if (raw) setProfileOverride(JSON.parse(raw));
    } catch {}
    return () => {
      mounted = false;
    };
  }, []);

  async function evaluate(input: any, formula?: FormulaValue): Promise<EvalResponse> {
    try {
      const body: any = { input };
      if (formula) body.formula = formula;
      const res = await fetch("/api/v1/price/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      setLastResult(j);
      return j as EvalResponse;
    } catch (err: any) {
      const e: EvalResponse = { ok: false, error: String(err?.message ?? err) };
      setLastResult(e);
      return e;
    }
  }

  async function computeActive(input: any) {
    const formula = selectedSource === "store" ? storeFormula : selectedSource === "profile" ? profileOverride : null;
    return evaluate(input, formula);
  }

  async function saveStorewide(value: FormulaValue | null) {
    try {
      const res = await fetch("/api/v1/settings/price-formula", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId: tenantId ?? null, value }),
      });
      const j = await res.json();
      if (j?.ok) {
        // refresh storeFormula
        setStoreFormula(j.data?.value ?? value);
        return { ok: true, data: j.data };
      }
      return { ok: false, error: j };
    } catch (err) {
      return { ok: false, error: err };
    }
  }

  function setProfileOverrideLocal(f: FormulaValue | null) {
    try {
      if (f == null) localStorage.removeItem("price_profile_override");
      else localStorage.setItem("price_profile_override", JSON.stringify(f));
      setProfileOverride(f);
    } catch {
      // ignore
    }
  }

  const ctx: CalculatorContextValue = useMemo(
    () => ({
      basicValue,
      setBasicValue,
      basicRounding,
      setBasicRounding,
      includeShippingBuffer,
      setIncludeShippingBuffer,
      selectedSource,
      setSelectedSource,
      storeFormula,
      profileOverride,
      setProfileOverrideLocal,
      evaluate,
      computeActive,
      lastResult,
      setLastResult,
      saveStorewide,
      loadingStoreFormula,
    }),
    [
      basicValue,
      basicRounding,
      includeShippingBuffer,
      selectedSource,
      storeFormula,
      profileOverride,
      lastResult,
      loadingStoreFormula,
    ]
  );

  return <CalculatorContext.Provider value={ctx}>{children}</CalculatorContext.Provider>;
}
