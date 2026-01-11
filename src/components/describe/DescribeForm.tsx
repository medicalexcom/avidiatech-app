"use client";

import React, { useState } from "react";
import { DescribeRequest, DescribeFormat } from "./types";
import useDescribe from "@/hooks/useDescribe";

/**
 * Left-side form for AvidiaDescribe
 * - Validates required fields
 * - Converts specs text area to key:value object (optional)
 * - Calls the generate function from useDescribe
 */

const FORMATS: { label: string; value: DescribeFormat }[] = [
  { label: "Avidia Standard", value: "avidia_standard" },
  { label: "Shopify Conversion", value: "shopify" },
  { label: "General E-commerce", value: "ecommerce" },
  { label: "Technical / Industrial", value: "technical" },
  { label: "Lifestyle / Marketing", value: "lifestyle" },
];

function parseSpecsText(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const obj: Record<string, string> = {};
  for (const line of lines) {
    const [k, ...rest] = line.split(":");
    if (!k) continue;
    obj[k.trim()] = rest.join(":").trim();
  }
  return obj;
}

export default function DescribeForm() {
  const { generate, loading, error } = useDescribe();
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [specsText, setSpecsText] = useState("");
  const [format, setFormat] = useState<DescribeFormat>("avidia_standard");
  const [lastPayloadId, setLastPayloadId] = useState<string | null>(null);

  async function onSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim() || !shortDescription.trim()) {
      alert("Please provide product name and a short description.");
      return;
    }

    const specs = parseSpecsText(specsText);
    const payload: DescribeRequest = {
      name: name.trim(),
      shortDescription: shortDescription.trim(),
      brand: brand.trim() || undefined,
      specs: Object.keys(specs).length ? specs : undefined,
      format,
    };

    const res = await generate(payload);
    if (res?.normalizedPayload?.id) setLastPayloadId(res.normalizedPayload.id);
    // The DescribeOutput subscribes to the shared result via sessionStorage (see hook)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 bg-white dark:bg-slate-900 border rounded-lg p-4 shadow-sm">
      <div>
        <label className="text-xs font-medium">Product name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="e.g. Portable Folding Ramp" />
      </div>

      <div>
        <label className="text-xs font-medium">Short manufacturer description</label>
        <textarea value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} rows={3} className="mt-1 w-full border rounded px-3 py-2" placeholder="One or two lines describing the product" />
      </div>

      <div>
        <label className="text-xs font-medium">Brand (optional)</label>
        <input value={brand} onChange={(e) => setBrand(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="Brand name" />
      </div>

      <div>
        <label className="text-xs font-medium">Specs (optional — key: value per line)</label>
        <textarea value={specsText} onChange={(e) => setSpecsText(e.target.value)} rows={4} className="mt-1 w-full border rounded px-3 py-2" placeholder="Weight: 12 kg\nWidth: 80 cm" />
        <p className="text-xs text-slate-500 mt-1">Tip: use key:value per line to give the generator structured info.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium">Description format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value as DescribeFormat)} className="mt-1 w-full border rounded px-3 py-2">
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-44">
          <button type="submit" disabled={loading} className="mt-6 w-full px-3 py-2 bg-indigo-600 text-white rounded">
            {loading ? "Generating…" : "Generate Description"}
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">Error: {error.message || String(error)}</div>}
      {lastPayloadId && <div className="text-xs text-slate-500">Last generated id: {lastPayloadId}</div>}
    </form>
  );
}
