"use client";

import React, { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProductImage {
  id: string;
  label: string;
  type: "main" | "alt" | "detail" | "context" | "thumbnail";
  srcPlaceholder: string;
  altText: string;
  width: number;
  height: number;
  variantTag?: string;
  approved: boolean;
  order: number;
}

interface ImageSet {
  productName: string;
  sourceUrl: string;
  images: ProductImage[];
}

// ─── Sample image sets ─────────────────────────────────────────────────────────
const SAMPLE_SETS: Record<string, ImageSet> = {
  "iv-pole": {
    productName: "McKesson IV Pole, Stainless Steel",
    sourceUrl: "mckesson.com/products/iv-pole-ss-5leg",
    images: [
      { id: "i1", label: "Primary product shot", type: "main", srcPlaceholder: "bg-gradient-to-br from-slate-200 to-slate-100", altText: "McKesson IV Pole, 5-leg stainless steel base, height-adjustable, right-angle view", width: 800, height: 800, approved: true, order: 0 },
      { id: "i2", label: "Base detail", type: "detail", srcPlaceholder: "bg-gradient-to-br from-slate-300 to-slate-200", altText: "McKesson IV Pole 5-leg non-marking caster base detail, 26-inch diameter", width: 600, height: 600, approved: true, order: 1 },
      { id: "i3", label: "Hooks close-up", type: "detail", srcPlaceholder: "bg-gradient-to-br from-slate-200 to-slate-100", altText: "McKesson IV Pole 6-hook stainless steel top, compatible with standard IV bags", width: 600, height: 600, approved: false, order: 2 },
      { id: "i4", label: "Clinical setting", type: "context", srcPlaceholder: "bg-gradient-to-br from-blue-100 to-slate-100", altText: "McKesson IV Pole in use in hospital room with infusion bag", width: 1200, height: 800, approved: false, order: 3 },
      { id: "i5", label: "Product dimensions diagram", type: "detail", srcPlaceholder: "bg-gradient-to-br from-slate-100 to-white", altText: "McKesson IV Pole height adjustment range diagram, 49–88 inches", width: 800, height: 800, approved: true, order: 4 },
      { id: "i6", label: "Thumbnail", type: "thumbnail", srcPlaceholder: "bg-gradient-to-br from-slate-200 to-white", altText: "McKesson IV Pole compact thumbnail", width: 200, height: 200, approved: true, order: 5 },
    ],
  },
  "bp-monitor": {
    productName: "Omron HEM-7361T Blood Pressure Monitor",
    sourceUrl: "omron.com/products/hem-7361t",
    images: [
      { id: "j1", label: "Main product", type: "main", srcPlaceholder: "bg-gradient-to-br from-blue-200 to-slate-100", altText: "Omron HEM-7361T blood pressure monitor with upper arm cuff, compact design", width: 800, height: 800, approved: true, order: 0 },
      { id: "j2", label: "Cuff detail", type: "detail", srcPlaceholder: "bg-gradient-to-br from-blue-100 to-slate-100", altText: "Omron HEM-7361T pre-formed upper arm cuff with tube and connector", width: 600, height: 600, approved: true, order: 1 },
      { id: "j3", label: "Display close-up", type: "detail", srcPlaceholder: "bg-gradient-to-br from-slate-200 to-blue-50", altText: "Omron HEM-7361T LCD display showing systolic/diastolic reading and pulse", width: 600, height: 600, approved: false, order: 2 },
      { id: "j4", label: "App integration", type: "context", srcPlaceholder: "bg-gradient-to-br from-blue-100 to-white", altText: "Omron HEM-7361T connected to Omron Connect app via Bluetooth on smartphone", width: 1200, height: 800, variantTag: "Bluetooth model", approved: true, order: 3 },
      { id: "j5", label: "Box/packaging", type: "context", srcPlaceholder: "bg-gradient-to-br from-slate-100 to-white", altText: "Omron HEM-7361T blood pressure monitor retail packaging", width: 800, height: 800, approved: false, order: 4 },
    ],
  },
};

// ─── Image card ───────────────────────────────────────────────────────────────
function ImageCard({
  image,
  onToggleApprove,
  onEditAlt,
  onRemove,
  dragging,
}: {
  image: ProductImage;
  onToggleApprove: (id: string) => void;
  onEditAlt: (id: string, alt: string) => void;
  onRemove: (id: string) => void;
  dragging: boolean;
}) {
  const [editingAlt, setEditingAlt] = useState(false);
  const [altDraft, setAltDraft] = useState(image.altText);

  const typeColors: Record<string, string> = {
    main: "border-indigo-300/60 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300",
    detail: "border-cyan-300/60 bg-cyan-50 text-cyan-700 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300",
    context: "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300",
    thumbnail: "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
    alt: "border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
  };

  return (
    <div className={`rounded-xl border bg-white dark:bg-slate-900 ${image.approved ? "border-emerald-200/60 dark:border-emerald-500/30" : "border-slate-200 dark:border-slate-800"} ${dragging ? "opacity-50" : ""}`}>
      {/* Image preview */}
      <div className={`relative h-28 w-full rounded-t-xl ${image.srcPlaceholder} flex items-center justify-center`}>
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{image.width}×{image.height}</span>
        {image.approved && (
          <span className="absolute right-2 top-2 rounded-full border border-emerald-300/60 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">✓</span>
        )}
        {image.variantTag && (
          <span className="absolute bottom-2 left-2 rounded-full border border-amber-300/60 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">{image.variantTag}</span>
        )}
      </div>

      <div className="p-2.5 space-y-2">
        <div className="flex items-start justify-between gap-1.5">
          <div>
            <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200">{image.label}</p>
            <span className={`inline-block rounded-full border px-1.5 py-0 text-[9px] font-medium ${typeColors[image.type] ?? typeColors["alt"]}`}>{image.type}</span>
          </div>
        </div>

        {/* Alt text */}
        {editingAlt ? (
          <div className="space-y-1">
            <textarea
              className="w-full rounded border border-violet-300 bg-white p-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-violet-400 dark:border-violet-500/60 dark:bg-slate-800 dark:text-slate-100"
              rows={3}
              value={altDraft}
              onChange={(e) => setAltDraft(e.target.value)}
            />
            <div className="flex gap-1.5">
              <button onClick={() => { onEditAlt(image.id, altDraft); setEditingAlt(false); }} className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700">Save</button>
              <button onClick={() => { setAltDraft(image.altText); setEditingAlt(false); }} className="text-[10px] text-slate-400">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditingAlt(true)} className="group w-full text-left">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 group-hover:text-violet-500">{image.altText}</p>
            <p className="text-[9px] text-slate-300 dark:text-slate-600 group-hover:text-violet-400">edit alt text</p>
          </button>
        )}

        {/* Actions */}
        <div className="flex gap-1.5 border-t border-slate-100 pt-1.5 dark:border-slate-800">
          <button
            onClick={() => onToggleApprove(image.id)}
            className={`flex-1 rounded py-1 text-[10px] font-medium transition ${image.approved ? "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300"}`}
          >
            {image.approved ? "Approved" : "Approve"}
          </button>
          <button onClick={() => onRemove(image.id)} className="rounded bg-rose-50 p-1 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ImagesPage() {
  const [selectedSet, setSelectedSet] = useState<keyof typeof SAMPLE_SETS | "">("");
  const [urlInput, setUrlInput] = useState("");
  const [imageSet, setImageSet] = useState<ImageSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function extract() {
    if (!selectedSet && !urlInput.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    const key = selectedSet || "iv-pole";
    setImageSet({ ...SAMPLE_SETS[key as keyof typeof SAMPLE_SETS] });
    setLoading(false);
    showToast("Images extracted and alt text generated.");
  }

  function toggleApprove(id: string) {
    setImageSet((prev) => prev ? { ...prev, images: prev.images.map((img) => img.id === id ? { ...img, approved: !img.approved } : img) } : null);
  }

  function editAlt(id: string, alt: string) {
    setImageSet((prev) => prev ? { ...prev, images: prev.images.map((img) => img.id === id ? { ...img, altText: alt } : img) } : null);
    showToast("Alt text updated.");
  }

  function removeImage(id: string) {
    setImageSet((prev) => prev ? { ...prev, images: prev.images.filter((img) => img.id !== id) } : null);
    showToast("Image removed from set.");
  }

  function approveAll() {
    setImageSet((prev) => prev ? { ...prev, images: prev.images.map((img) => ({ ...img, approved: true })) } : null);
    showToast("All images approved.");
  }

  function exportSet() {
    if (!imageSet) return;
    const csv = ["id,label,type,alt_text,width,height,variant_tag,approved",
      ...imageSet.images.map((img) => `${img.id},"${img.label}",${img.type},"${img.altText}",${img.width},${img.height},${img.variantTag ?? ""},${img.approved}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "image-set.csv";
    a.click();
    showToast("Image set exported.");
  }

  function syncToStore() {
    showToast("Approved images queued for sync to connected store.");
  }

  const approvedCount = imageSet?.images.filter((i) => i.approved).length ?? 0;
  const totalCount = imageSet?.images.length ?? 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-500/20" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-500/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-lg dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200">
          {toast}
        </div>
      )}

      <div className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <section className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
            Commerce &amp; Automation · AvidiaImages
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Turn noisy image carousels into{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 dark:from-emerald-300 dark:via-teal-300 dark:to-sky-300">
              clean, variant-aware galleries
            </span>.
          </h1>
          <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Select a sample product or paste a URL. AvidiaImages extracts, deduplicates, generates alt text, and lets you review before syncing downstream.
          </p>
        </section>

        {/* Source input */}
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/85">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Image source</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-200">Sample product</label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                value={selectedSet}
                onChange={(e) => { setSelectedSet(e.target.value as any); setUrlInput(""); }}
              >
                <option value="">— Choose sample —</option>
                <option value="iv-pole">McKesson IV Pole (6 images)</option>
                <option value="bp-monitor">Omron BP Monitor (5 images)</option>
              </select>
            </div>
            <div className="flex items-end justify-center text-[11px] font-medium text-slate-400">or</div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-200">Product URL</label>
              <input
                type="url"
                placeholder="https://manufacturer.com/product/..."
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setSelectedSet(""); }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={extract}
              disabled={loading || (!selectedSet && !urlInput.trim())}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(16,185,129,0.4)] transition hover:-translate-y-px hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Extracting…
                </>
              ) : "Extract images"}
            </button>
          </div>
        </div>

        {/* Gallery workspace */}
        {imageSet && (
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 shadow-[0_18px_45px_rgba(148,163,184,0.28)] dark:border-slate-800 dark:bg-slate-900/85">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{imageSet.productName}</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{imageSet.sourceUrl}</p>
                <p className="mt-1 text-[11px]">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{approvedCount}/{totalCount}</span>
                  <span className="text-slate-400"> images approved</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={approveAll} className="rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                  Approve all
                </button>
                <button onClick={syncToStore} className="rounded-lg border border-sky-300/60 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300">
                  Sync to store
                </button>
                <button onClick={exportSet} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  Export CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {imageSet.images.map((img) => (
                <ImageCard
                  key={img.id}
                  image={img}
                  onToggleApprove={toggleApprove}
                  onEditAlt={editAlt}
                  onRemove={removeImage}
                  dragging={draggingId === img.id}
                />
              ))}
            </div>

            <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
              Click any alt text to edit inline. Approved images will sync to your connected store via AvidiaImport. Variant-tagged images are mapped to specific option values.
            </p>
          </div>
        )}

        {!imageSet && !loading && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
            <span className="text-4xl">🖼</span>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No images yet</p>
            <p className="text-[11px] text-slate-500">Select a sample product or paste a URL to extract and review images.</p>
          </div>
        )}
      </div>
    </main>
  );
}
