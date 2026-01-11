import crypto from "crypto";

export function stableStringify(value: any): string {
  const seen = new WeakSet();

  const stringify = (v: any): any => {
    if (v === null || v === undefined) return v;
    if (typeof v !== "object") return v;

    if (seen.has(v)) {
      // cycles not expected; replace deterministically
      return "[Circular]";
    }
    seen.add(v);

    if (Array.isArray(v)) {
      return v.map((x) => stringify(x));
    }

    const keys = Object.keys(v).sort();
    const out: any = {};
    for (const k of keys) out[k] = stringify(v[k]);
    return out;
  };

  return JSON.stringify(stringify(value));
}

export function sha256Hex(value: any): string {
  const s = typeof value === "string" ? value : stableStringify(value);
  return crypto.createHash("sha256").update(s).digest("hex");
}
