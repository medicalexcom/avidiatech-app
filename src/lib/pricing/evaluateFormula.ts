// src/lib/pricing/evaluateFormula.ts
import vm from "vm";
import type { IncomingMessage } from "http";

// Input shape the formula should expect (this is what we pass)
export type PriceInput = {
  cost: number;       // item cost
  shipping?: number;  // shipping cost (optional override)
  metadata?: Record<string, any>; // any other product metadata
  options?: Record<string, any>;  // job-level options (e.g. includeSeo, source_tenant)
};

// Result structure
export type PriceResult = {
  ok: boolean;
  price?: number;
  error?: string;
  debug?: any;
};

/**
 * evaluateFormulaString
 * - formulaSource should define a function named `calculatePrice` that accepts cost (number) or (input: PriceInput)
 *   Examples:
 *     - function calculatePrice(cost) { return Math.round(cost * 2) / 100; }
 *     - function calculatePrice(input) { const cost = input.cost; ... }
 *
 * - This evaluator executes formulaSource in a VM with:
 *   - a `sanitizeMoneyG` utility available
 *   - a limited global API (Math, Number, Date)
 *   - a short timeout (default 50ms)
 *
 * Security note:
 * - This approach is relatively safe for moderately trusted admins. For untrusted editors, run formulas only via a dedicated sandbox service or use a math-expression engine (mathjs, jexl).
 */
export async function evaluateFormulaString(
  formulaSource: string,
  input: PriceInput,
  opts?: { timeoutMs?: number }
): Promise<PriceResult> {
  const timeoutMs = opts?.timeoutMs ?? 100; // small
  // build the script: we expect calculatePrice to be defined
  const scriptSrc = `
    "use strict";
    const sanitizeMoneyG = ${sanitizeMoneyG.toString()};
    ${formulaSource}
    if (typeof calculatePrice !== 'function') {
      throw new Error('calculatePrice function not defined');
    }
    // unify input: allow both number or object
    const _input = (typeof input === 'number') ? { cost: input } : input;
    const out = calculatePrice(_input);
    // coerce numeric
    return (typeof out === 'number' && Number.isFinite(out)) ? out : (function(){ throw new Error('calculatePrice did not return finite number'); })();
  `;

  // Create a new VM context with only safe globals
  const sandbox: any = {
    input,
    Math,
    Number,
    Date,
    // keep console but restrict in production (optional)
    console: {
      log: (...args: any[]) => { /* no-op or capture to debug */ },
      warn: (...args: any[]) => { /* no-op */ },
      error: (...args: any[]) => { /* no-op */ }
    },
  };

  try {
    const script = new vm.Script(scriptSrc, { filename: "pricing-formula.js", displayErrors: true });
    const ctx = vm.createContext(sandbox, { name: "pricing-formula-context" });
    // run with timeout; Node's vm has a timeout option for runInContext
    const res = script.runInContext(ctx, { timeout: timeoutMs });
    // If the script returns a value via `return` top-level, Node VM will not return it.
    // To retrieve the value we expose it into sandbox. Adapt pattern: put result into sandbox.__result.
    // Because above used return, fallback: check sandbox.__result or returned res.
    const price = (typeof res === "number" && Number.isFinite(res)) ? res : sandbox.__result ?? res;
    if (typeof price !== "number" || !Number.isFinite(price)) {
      return { ok: false, error: "formula returned non-numeric result" };
    }
    return { ok: true, price };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

/* --- Legacy helper (your old engine) --- */
export function roundPrice(n: number) { return Math.floor(n) + 0.99; }

export function calculatePriceLegacy(input: PriceInput) {
  const cost = Number(input?.cost ?? NaN);
  if (!isFinite(cost)) throw new Error("invalid cost");

  const tiers = [
    { max: 5,    mult: 3.0 },
    { max: 10,   mult: 2.75 },
    { max: 25,   mult: 2.5 },
    { max: 50,   mult: 2.0 },
    { max: 100,  mult: 1.75 },
    { max: 300,  mult: 1.5 },
    { max: 500,  mult: 1.4 },
    { max: 1000, mult: 1.3 },
    { max: Infinity, mult: 1.275 }
  ];

  const upper = tiers.find(t => cost <= t.max) || tiers[tiers.length - 1];
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
    if (cost <= 10)      shippingBuffer = 8;
    else if (cost <= 25) shippingBuffer = 7;
    else                 shippingBuffer = 6;
    adjusted += shippingBuffer;
  }

  adjusted = roundPrice(adjusted);

  if (adjusted < 14.99) adjusted = 14.99;
  return adjusted;
}

/* --- sanitizeMoneyG (copied/polite adaptation of your routine) --- */
export function sanitizeMoneyG(val: any) {
  if (val == null) return NaN;
  let s = String(val).trim();

  let negative = false;
  if (/^\s*\(.+\)\s*$/.test(s)) { negative = true; s = s.replace(/^\s*\(|\)\s*$/g, ''); }
  s = s.replace(/\u2212/g, '-'); // unicode minus → ascii
  s = s.replace(/[A-Za-z$€£¥₩₹₽₺₫RSDZŁ₴₦₱₪₡₲₸₮₭₼]/g, '');
  s = s.replace(/[\u00A0\s]/g, '');
  s = s.replace(/(?!^)-/g, '');

  const hasComma = s.indexOf(',') !== -1;
  const hasDot   = s.indexOf('.') !== -1;

  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(',');
    const lastDot   = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(/,/g, '.'); // EU
    } else {
      s = s.replace(/,/g, '');                     // US
    }
  } else if (hasComma) {
    s = /,\d{1,2}$/.test(s) ? s.replace(/,/g, '.') : s.replace(/,/g, '');
  } else if (hasDot) {
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1) {
      if (/\.\d{1,2}$/.test(s)) {
        const parts = s.split('.'); const dec = parts.pop(); s = parts.join('') + '.' + dec;
      } else {
        s = s.replace(/\./g, '');
      }
    } else {
      if (/\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
    }
  }

  const n = Number(s);
  if (!isFinite(n)) return NaN;
  return negative ? -n : n;
}
