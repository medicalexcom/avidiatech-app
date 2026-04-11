"use client";

import React, { useState } from "react";
import PageShell from "@/components/layout/PageShell";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────
type Template = "conversion" | "technical" | "visual";
type Channel = "desktop" | "mobile" | "marketplace";
type CTA = "add" | "quote" | "contact";
type SecondaryCTA = "manuals" | "compare" | "share";
type Brand = "medicalex" | "demo-bc" | "generic";

interface LayoutConfig {
  template: Template;
  brand: Brand;
  channel: Channel;
  cta: CTA;
  secondaryCta: SecondaryCTA;
  blocks: string[];
}

const ALL_BLOCKS = [
  "Hero + primary CTA",
  "Key features grid",
  "Specifications table",
  "Downloads & manuals",
  "Usage & care",
  "Warranty & returns",
  "FAQs / Q&A",
];

const templatePresets: Record<Template, { name: string; desc: string; defaultBlocks: string[] }> = {
  conversion: {
    name: "Conversion-focused",
    desc: "Hero, key benefits, spec table, FAQs, trust badges.",
    defaultBlocks: ["Hero + primary CTA", "Key features grid", "Specifications table", "FAQs / Q&A"],
  },
  technical: {
    name: "Technical buyers",
    desc: "Compact hero, dense specs, downloads, regulatory notes.",
    defaultBlocks: ["Hero + primary CTA", "Specifications table", "Downloads & manuals", "Usage & care", "Warranty & returns"],
  },
  visual: {
    name: "Visual storytelling",
    desc: "Large imagery, highlights, use cases, testimonials.",
    defaultBlocks: ["Hero + primary CTA", "Key features grid", "Usage & care", "FAQs / Q&A"],
  },
};

const sampleProduct = {
  brand: "McKesson",
  category: "IV & Infusion",
  name: "Adjustable IV Pole, 5-Leg Base, Stainless Steel",
  shortDesc: "Hospital-grade IV pole with six-hook top and heavy-duty 5-leg base for stability on smooth or textured floors. Height-adjustable from 49 to 88 inches.",
  features: [
    "Height-adjustable pole: 49 to 88 inches",
    "Stable 5-leg, low-profile base with non-marking casters",
    "Supports up to 30 lbs of infusion equipment",
    "Stainless steel construction, corrosion-resistant finish",
    "Compatible with standard infusion pump mounts",
  ],
  specs: [
    { key: "Height range", value: "49–88 in (124–224 cm)" },
    { key: "Base type", value: "5-leg, 26 in diameter" },
    { key: "Weight capacity", value: "30 lbs (13.6 kg)" },
    { key: "Material", value: "304 stainless steel" },
    { key: "Hook count", value: "6 stainless hooks" },
    { key: "Casters", value: "1.5 in, non-marking rubber" },
    { key: "Assembly", value: "No tools required" },
    { key: "Ships as", value: "1 unit, partially assembled" },
  ],
  manuals: [
    "IFU – Setup & operation (PDF)",
    "Cleaning & disinfection guide (PDF)",
    "Warranty & service terms (PDF)",
  ],
  faqs: [
    { q: "Is this compatible with infusion pumps?", a: "Yes — the hooks accept standard IV bags and most pole-mounted infusion pumps." },
    { q: "What cleaning agents are recommended?", a: "Use hospital-grade quaternary ammonium or isopropyl alcohol wipes on all metal surfaces." },
    { q: "Does it ship fully assembled?", a: "The base and pole ship as two pieces and connect without tools in under 2 minutes." },
  ],
};

// ─── Preview component ────────────────────────────────────────────────────────
function LivePreview({ config }: { config: LayoutConfig }) {
  const { template, channel, cta, secondaryCta, blocks } = config;
  const isMobile = channel === "mobile";
  const isMarketplace = channel === "marketplace";

  const ctaLabel: Record<CTA, string> = { add: "Add to cart", quote: "Request a quote", contact: "Contact sales" };
  const secLabel: Record<SecondaryCTA, string> = { manuals: "View manuals & downloads", compare: "Compare similar products", share: "Share / save" };

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 ${isMobile ? "max-w-xs mx-auto" : ""}`}>
      {/* Browser chrome */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>
            {config.brand === "medicalex" ? "medicalex.com" : config.brand === "demo-bc" ? "demo.mybigcommerce.com" : "store.example.com"} · {templatePresets[template].name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {["desktop", "mobile", "marketplace"].map((c) => (
            <span key={c} className={`inline-flex h-1.5 w-1.5 rounded-full ${c === channel ? "bg-violet-400" : "bg-slate-300 dark:bg-slate-700"}`} />
          ))}
        </div>
      </div>

      {/* Product content */}
      <div className={`space-y-4 px-4 py-4 ${isMarketplace ? "px-3 py-3" : ""}`}>
        {blocks.includes("Hero + primary CTA") && (
          <div className={`${isMarketplace ? "" : "grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.2fr),minmax(0,0.9fr)]"}`}>
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {sampleProduct.brand} · {sampleProduct.category}
              </p>
              <h3 className={`font-semibold leading-snug text-slate-900 dark:text-slate-50 ${template === "technical" ? "text-base" : "text-lg"}`}>
                {sampleProduct.name}
              </h3>
              {template !== "technical" && (
                <p className="text-xs text-slate-600 dark:text-slate-300">{sampleProduct.shortDesc}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:opacity-90 ${cta === "add" ? "bg-emerald-600" : cta === "quote" ? "bg-blue-600" : "bg-violet-600"}`}>
                  {ctaLabel[cta]}
                </button>
                {!isMarketplace && (
                  <button className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {secLabel[secondaryCta]}
                  </button>
                )}
              </div>
            </div>
            {!isMarketplace && !isMobile && (
              <div className="h-28 rounded-lg border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-[10px] text-slate-400">
                Product imagery
              </div>
            )}
          </div>
        )}

        {blocks.includes("Key features grid") && (
          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Key features</h4>
            <ul className="space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
              {sampleProduct.features.slice(0, template === "technical" ? 3 : 4).map((f) => (
                <li key={f} className="flex items-start gap-1.5">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {blocks.includes("Specifications table") && (
          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Specifications</h4>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {sampleProduct.specs.slice(0, template === "visual" ? 3 : 5).map((s) => (
                <div key={s.key} className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">{s.key}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {blocks.includes("Downloads & manuals") && (
          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Manuals & downloads</h4>
            <ul className="space-y-1 text-[11px]">
              {sampleProduct.manuals.map((m) => (
                <li key={m} className="text-blue-600 underline underline-offset-2 dark:text-blue-400">{m}</li>
              ))}
            </ul>
          </div>
        )}

        {blocks.includes("Usage & care") && (
          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Usage & care</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">Clean with hospital-grade quaternary ammonium wipes. Do not submerge. Inspect casters quarterly.</p>
          </div>
        )}

        {blocks.includes("Warranty & returns") && (
          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Warranty & returns</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">1-year manufacturer warranty. 30-day returns accepted for unused items in original packaging.</p>
          </div>
        )}

        {blocks.includes("FAQs / Q&A") && (
          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">FAQs</h4>
            <div className="space-y-2">
              {sampleProduct.faqs.slice(0, 2).map((faq) => (
                <div key={faq.q} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/80">
                  <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200">{faq.q}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StudioPage() {
  const [config, setConfig] = useState<LayoutConfig>({
    template: "conversion",
    brand: "medicalex",
    channel: "desktop",
    cta: "add",
    secondaryCta: "manuals",
    blocks: templatePresets.conversion.defaultBlocks,
  });
  const [saved, setSaved] = useState(false);
  const [published, setPublished] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function applyTemplate(t: Template) {
    setConfig((prev) => ({ ...prev, template: t, blocks: templatePresets[t].defaultBlocks }));
  }

  function toggleBlock(b: string) {
    setConfig((prev) => ({
      ...prev,
      blocks: prev.blocks.includes(b) ? prev.blocks.filter((x) => x !== b) : [...prev.blocks, b],
    }));
  }

  function handleSave() {
    setSaved(true);
    showToast("Layout preset saved to AvidiaStudio.");
  }

  function handlePublish() {
    setPublished(true);
    showToast("Layout queued for publish to connected store.");
  }

  return (
    <PageShell glow="fuchsia">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-lg dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200">
          {toast}
        </div>
      )}

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-8 lg:px-8 lg:pt-6 lg:pb-10">
        {/* HEADER */}
        <section>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="min-w-[260px] flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/60 bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:bg-slate-950/90 dark:text-slate-300">
                  <span className="inline-flex h-3 w-3 items-center justify-center rounded-full border border-fuchsia-400/80 bg-slate-100 dark:bg-slate-900">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
                  </span>
                  AvidiaStudio · Page designer
                </div>
                {published && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-50 px-2.5 py-1 text-[10px] text-emerald-700 shadow-sm dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Published to store
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold leading-tight text-slate-900 sm:text-2xl dark:text-slate-50">
                  Design{" "}
                  <span className="bg-gradient-to-r from-fuchsia-500 via-cyan-500 to-sky-500 bg-clip-text text-transparent dark:from-fuchsia-300 dark:via-cyan-300 dark:to-sky-300">
                    conversion-ready product pages
                  </span>{" "}
                  directly on top of your data pipeline.
                </h1>
                <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
                  Choose a template, toggle blocks, and preview in real time. The preview updates live as you configure.
                </p>
              </div>
            </div>

            {/* Template presets */}
            <div className="w-full lg:w-[340px]">
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/95">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">Template presets</p>
                {(Object.entries(templatePresets) as [Template, typeof templatePresets[Template]][]).map(([key, tpl]) => (
                  <button
                    key={key}
                    onClick={() => applyTemplate(key)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                      config.template === key
                        ? "border-fuchsia-400/60 bg-fuchsia-50 dark:border-fuchsia-500/60 dark:bg-fuchsia-500/10"
                        : "border-slate-200 bg-slate-50 hover:border-fuchsia-300/60 hover:bg-white dark:border-slate-800 dark:bg-slate-900/90"
                    }`}
                  >
                    <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">{tpl.name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{tpl.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* MAIN LAYOUT */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr,1.2fr] lg:gap-6">
          {/* LEFT: controls */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm lg:p-5 dark:border-slate-800/80 dark:bg-slate-900/90">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Layout &amp; content controls</h2>

            <div className="space-y-3 text-xs">
              {/* Brand + channel */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-slate-800 dark:text-slate-200">Brand / storefront</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                    value={config.brand}
                    onChange={(e) => setConfig((p) => ({ ...p, brand: e.target.value as Brand }))}
                  >
                    <option value="medicalex">MedicalEx (BigCommerce)</option>
                    <option value="demo-bc">Demo store (BigCommerce)</option>
                    <option value="generic">Generic theme</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-slate-800 dark:text-slate-200">Target channel</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                    value={config.channel}
                    onChange={(e) => setConfig((p) => ({ ...p, channel: e.target.value as Channel }))}
                  >
                    <option value="desktop">Desktop layout</option>
                    <option value="mobile">Mobile-first</option>
                    <option value="marketplace">Marketplace detail page</option>
                  </select>
                </div>
              </div>

              {/* Page blocks */}
              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-slate-800 dark:text-slate-200">Page blocks</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ALL_BLOCKS.map((b) => (
                    <label
                      key={b}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 transition ${
                        config.blocks.includes(b)
                          ? "border-fuchsia-400/60 bg-fuchsia-50 dark:border-fuchsia-500/60 dark:bg-fuchsia-500/10"
                          : "border-slate-300 bg-white/90 hover:border-fuchsia-300/50 dark:border-slate-700 dark:bg-slate-950/80"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={config.blocks.includes(b)}
                        onChange={() => toggleBlock(b)}
                        className="h-3 w-3 rounded border border-slate-400 text-fuchsia-400 focus:ring-fuchsia-500/40 dark:border-slate-500 dark:bg-slate-900"
                      />
                      <span className="text-[11px] text-slate-700 dark:text-slate-200">{b}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* CTAs */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-slate-800 dark:text-slate-200">Primary CTA</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                    value={config.cta}
                    onChange={(e) => setConfig((p) => ({ ...p, cta: e.target.value as CTA }))}
                  >
                    <option value="add">Add to cart</option>
                    <option value="quote">Request a quote</option>
                    <option value="contact">Contact sales</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-slate-800 dark:text-slate-200">Secondary CTA</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/40 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                    value={config.secondaryCta}
                    onChange={(e) => setConfig((p) => ({ ...p, secondaryCta: e.target.value as SecondaryCTA }))}
                  >
                    <option value="manuals">View manuals / downloads</option>
                    <option value="compare">Compare similar products</option>
                    <option value="share">Share / save</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-500 px-3.5 py-2 text-xs font-semibold text-slate-50 shadow-md shadow-fuchsia-500/40 transition hover:-translate-y-[1px] hover:bg-fuchsia-400"
                >
                  {saved ? "✓ Preset saved" : "Save as Studio preset"}
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-xs font-semibold text-slate-100 transition hover:border-sky-400/60 hover:text-sky-100 dark:bg-slate-950"
                >
                  {published ? "✓ Published" : "Publish to store"}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: live preview */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm lg:p-5 dark:border-slate-800/80 dark:bg-slate-900/90">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Live preview</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Updates instantly as you toggle blocks and select options.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {(["desktop", "mobile", "marketplace"] as Channel[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setConfig((p) => ({ ...p, channel: c }))}
                    className={`rounded-md border px-2 py-1 text-[10px] transition ${
                      config.channel === c
                        ? "border-fuchsia-400 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-500 dark:bg-fuchsia-500/10 dark:text-fuchsia-300"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                    }`}
                  >
                    {c === "desktop" ? "🖥" : c === "mobile" ? "📱" : "🛒"}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[520px] overflow-y-auto rounded-xl">
              <LivePreview config={config} />
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Publish from Studio</span> pushes this layout + content to your connected store (e.g., a BigCommerce product ID) via the Avidia automation layer.
            </p>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
