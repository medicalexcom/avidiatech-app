// src/lib/pricing/evaluateFormula.ts
// Safe-ish formula evaluator used by the price calculator.
// - Evaluates a stored JS function `calculatePrice(input)` inside Node's vm with a short timeout.
// - Provides a legacy, structured pricing engine (calculatePriceLegacy) copied from the old system.
// - Exports helpers and types for use by API routes / frontend tester.
//
// Security note:
// - This is NOT a perfect sandbox; vm provides limited isolation. Restrict edit access to admins only.
// - For untrusted editors, run evaluations in an isolated service (e.g. serverless with enforced timeout and no network).

import vm from "vm";

export type PriceInput = {
  cost: number;
  shipping?: number;
  metadata?: Record<string, any>;
  options?: Record<string, any>;
};

export type PriceResult = {
  ok: boolean;
  price?: number;
  error?: string;
  debug?: any;
};

export async function evaluateFormulaString(
  formulaSource: string,
  input: PriceInput | number,
  opts?: { timeoutMs?: number }
): Promise<PriceResult> {
  const timeoutMs = opts?.timeoutMs ?? 100;

  // Build script that defines calculatePrice (from formulaSource) and writes result to globalThis.__result
  const scriptSrc = `
    "use strict";
    // provide sanitizeMoneyG helper
    const sanitizeMoneyG = ${sanitizeMoneyG.toString()};
    ${formulaSource}

    if (typeof calculatePrice !== 'function') {
      throw new Error('calculatePrice function not defined');
    }

    const _input = (typeof input === 'number') ? { cost: input } : input;

    // Execute and store result on globalThis so host can retrieve it
    const __res = (function() {
      try {
        return calculatePrice(_input);
      } catch (err) {
        // rethrow to be handled by VM runner
        throw err;
      }
    })();
    globalThis.__result = __res;
  `;

  // Prepare sandboxed context with limited globals
  const sandbox: any = {
    input,
    Math,
    Number,
    Date,
    // minimal console to avoid noisy behavior; do not expose process, require, etc.
    console: {
      log: (..._args: any[]) => {},
      warn: (..._args: any[]) => {},
      error: (..._args: any[]) => {},
    },
    // result will be written here by the script as globalThis.__result
    __result: undefined,
  };

  try {
    const script = new vm.Script(scriptSrc, { filename: "pricing-formula.js" });
    const ctx = vm.createContext(sandbox, { name: "pricing-formula-context" });

    // Run synchronously with a timeout (ms). This prevents runaway execution.
    script.runInContext(ctx, { timeout: timeoutMs });

    const price = sandbox.__result;

    if (typeof price !== "number" || !Number.isFinite(price)) {
      return { ok: false, error: "formula returned non-numeric result", debug: { raw: price } };
    }

    return { ok: true, price };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err), debug: { message: err?.stack ?? String(err) } };
  }
}

/* --- Legacy engine (copied and adapted) --- */

export function roundPrice(n: number) {
  return Math.floor(n) + 0.99;
}

export function calculatePriceLegacy(input: PriceInput | number) {
  const cost = Number(typeof input === "number" ? input : input?.cost ?? NaN);
  if (!isFinite(cost)) throw new Error("invalid cost");

  const tiers = [
    { max: 5, mult: 3.0 },
    { max: 10, mult: 2.75 },
    { max: 25, mult: 2.5 },
    { max: 50, mult: 2.0 },
    { max: 100, mult: 1.75 },
    { max: 300, mult: 1.5 },
    { max: 500, mult: 1.4 },
    { max: 1000, mult: 1.3 },
    { max: Infinity, mult: 1.275 },
  ];

  const upper = tiers.find((t) => cost <= t.max) || tiers[tiers.length - 1];
  const lowerIndex = Math.max(0, tiers.indexOf(upper) - 1);
  const lower = lowerIndex >= 0 ? tiers[lowerIndex] : { max: 0, mult: 3.0 };
  const range = upper.max - lower.max;
  const weight = range ? (cost - lower.max) / range : 1;
  const mult = lower.mult + (upper.mult - lower.mult) * weight;

  const t = Math.min(cost / 2000, 1);
  const bonusPct = 0.10 - (0.10 - 0.05) * t;

  let adjusted = cost * mult * (1 + bonusPct);

  if (cost <= 50) {
    let shippingBuffer = 0;
    if (cost <= 10) shippingBuffer = 8;
    else if (cost <= 25) shippingBuffer = 7;
    else shippingBuffer = 6;
    adjusted += shippingBuffer;
  }

  adjusted = roundPrice(adjusted);

  if (adjusted < 14.99) adjusted = 14.99;

  return adjusted;
}

/* --- sanitizeMoneyG (adapted from your routine) --- */

export function sanitizeMoneyG(val: any) {
  if (val == null) return NaN;
  let s = String(val).trim();

  // (123) => -123
  let negative = false;
  if (/^\s*\(.+\)\s*$/.test(s)) {
    negative = true;
    s = s.replace(/^\s*\(|\)\s*$/g, "");
  }
  s = s.replace(/\u2212/g, "-"); // unicode minus → ascii

  // strip currency symbols/codes & spaces
  s = s.replace(/[A-Za-z$€£¥₩₹₽₺₫RSDZŁ₴₦₱₪₡₲₸₮₭₼]/g, "");
  s = s.replace(/[\u00A0\s]/g, "");

  // keep only a leading minus
  s = s.replace(/(?!^)-/g, "");

  const hasComma = s.indexOf(",") !== -1;
  const hasDot = s.indexOf(".") !== -1;

  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(/,/g, "."); // EU
    } else {
      s = s.replace(/,/g, ""); // US
    }
  } else if (hasComma) {
    s = /,\d{1,2}$/.test(s) ? s.replace(/,/g, ".") : s.replace(/,/g, "");
  } else if (hasDot) {
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1) {
      if (/\.\d{1,2}$/.test(s)) {
        const parts = s.split(".");
        const dec = parts.pop();
        s = parts.join("") + "." + dec;
      } else {
        s = s.replace(/\./g, "");
      }
    } else {
      if (/\.\d{3}$/.test(s)) s = s.replace(/\./g, ""); // lone thousands dot
    }
  }

  const n = Number(s);
  if (!isFinite(n)) return NaN;
  return negative ? -n : n;
}
