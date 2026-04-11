"use client";

import React, { useEffect, useState } from "react";

type MappingModalProps = {
  open: boolean;
  headers: string[];
  initialMapping?: Record<string, string>;
  onSave: (mapping: Record<string, string>) => void;
  onClose: () => void;
};

const TARGET_FIELDS = [
  "",
  "sku",
  "title",
  "description",
  "price",
  "inventory",
  "weight",
  "brand",
  "image",
  "category",
];

export default function MappingModal({ open, headers, initialMapping = {}, onSave, onClose }: MappingModalProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    // initialize auto-mapping heuristics
    const m: Record<string, string> = {};
    for (const h of headers) {
      if (initialMapping[h]) {
        m[h] = initialMapping[h];
        continue;
      }
      const k = h.toLowerCase();
      if (k.includes("sku")) m[h] = "sku";
      else if (k.includes("title") || k.includes("name")) m[h] = "title";
      else if (k.includes("desc")) m[h] = "description";
      else if (k.includes("price")) m[h] = "price";
      else if (k.includes("qty") || k.includes("inventory") || k.includes("stock")) m[h] = "inventory";
      else m[h] = "";
    }
    setMapping(m);
  }, [headers, initialMapping]);

  function update(h: string, v: string) {
    setMapping((s) => ({ ...s, [h]: v }));
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Map source columns to product fields</h3>
          <button onClick={onClose} className="px-2 py-1 text-sm">Close</button>
        </div>

        <div className="mt-3 max-h-[60vh] overflow-auto">
          <table className="w-full table-auto">
            <thead>
              <tr>
                <th className="text-left text-xs text-slate-500 pb-2">Source column</th>
                <th className="text-left text-xs text-slate-500 pb-2">Map to field</th>
              </tr>
            </thead>
            <tbody>
              {headers.map((h) => (
                <tr key={h}>
                  <td className="py-2 text-sm">{h}</td>
                  <td className="py-2">
                    <select value={mapping[h] ?? ""} onChange={(e) => update(h, e.target.value)} className="rounded border px-2 py-1 text-sm">
                      {TARGET_FIELDS.map((f) => (
                        <option key={f} value={f}>{f === "" ? "-- ignore --" : f}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={() => { onSave(mapping); }} className="px-3 py-2 rounded bg-emerald-500 text-white">Save mapping</button>
          <button onClick={onClose} className="px-3 py-2 rounded border">Cancel</button>
        </div>
      </div>
    </div>
  );
}
