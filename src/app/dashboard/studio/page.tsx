"use client";

/**
 * Studio product page
 *
 * AvidiaStudio is an interactive design tool for customizing and publishing
 * product pages. It puts you in control of content and layout.
 */

import React from "react";

export const dynamic = "force-dynamic";

const templatePresets = [
  {
    name: "Conversion-focused",
    desc: "Hero, key benefits, spec table, FAQs, trust badges.",
  },
  {
    name: "Technical buyers",
    desc: "Compact hero, dense specs, downloads, regulatory notes.",
  },
  {
    name: "Visual storytelling",
    desc: "Large imagery, highlights, use cases, testimonials.",
  },
];

const layoutBlocks = [
  "Hero + primary CTA",
  "Key features grid",
  "Specifications table",
  "Downloads & manuals",
  "Usage & care",
  "Warranty & returns",
  "FAQs / Q&A",
];

export default function StudioPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Background gradients + grid (kept, light-mode-first) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-24 h-80 w-80 rounded-full bg-fuchsia-500/15 dark:bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-40 right-[-10rem] h-[24rem] w-[24rem] rounded-full bg-sky-500/10 dark:bg-sky-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.96)_40%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-8 lg:px-8 lg:pt-6 lg:pb-10">
        {/* COMPACT HEADER ROW (Cluster-style, no big frame) */}
        <section className="relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Left: compact copy + pills */}
            <div className="min-w-[260px] flex-1 space-y-4">
              {/* Top badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/60 bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:bg-slate-950/90 dark:text-slate-300">
                  <span className="inline-flex h-3 w-3 items-center justify-center rounded-full border border-fuchsia-400/80 bg-slate-100 dark:bg-slate-900">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-fuchsia-400" />
                  </span>
                  AvidiaStudio • Page designer
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-50 px-2.5 py-1 text-[10px] text-amber-700 shadow-sm dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Coming soon
                </span>
              </div>

              {/* Title + subtitle (Cluster header scale) */}
              <div className="space-y-2">
                <h1 className="text-xl font-semibold leading-tight text-slate-900 sm:text-2xl dark:text-slate-50">
                  Design{" "}
                  <span className="bg-gradient-to-r from-fuchsia-500 via-cyan-500 to-sky-500 bg-clip-text text-transparent dark:from-fuchsia-300 dark:via-cyan-300 dark:to-sky-300">
                    conversion-ready product pages
                  </span>{" "}
                  directly on top of your data pipeline.
                </h1>
                <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
                  AvidiaStudio sits on Extract, Describe, and SEO so you can
                  adjust copy, rearrange blocks, and preview layout before
                  syncing to BigCommerce, WooCommerce, or your CMS — without
                  rebuilding the page by hand.
                </p>
              </div>

              {/* Inline feature pills (compact, Cluster-style) */}
              <div className="flex flex-wrap gap-3 text-[11px]">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/45 bg-white/90 px-3 py-1.5 text-slate-700 shadow-sm dark:bg-slate-950/90 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>Pulls structured content from AvidiaExtract / AvidiaSEO.</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/45 bg-white/90 px-3 py-1.5 text-slate-700 shadow-sm dark:bg-slate-950/90 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                  <span>Drag blocks, tweak copy, and keep your brand intact.</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/45 bg-white/90 px-3 py-1.5 text-slate-700 shadow-sm dark:bg-slate-950/90 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>One click to publish back to your store or CMS.</span>
                </div>
              </div>
            </div>

            {/* Right: compact template snapshot card */}
            <div className="mt-4 w-full lg:mt-0 lg:w-[360px] xl:w-[400px]">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/95">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400">
                    Template presets (preview)
                  </p>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Wire to /studio later
                  </span>
                </div>
                <div className="space-y-2 text-[11px]">
                  {templatePresets.map((tpl) => (
                    <div
                      key={tpl.name}
                      className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/90"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {tpl.name}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-[2px] text-[9px] text-slate-500 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
                          Preset
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {tpl.desc}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="pt-1 text-[10px] text-slate-500 dark:text-slate-500">
                  Later, tenants can define reusable page templates and map them
                  to product types, brands, or categories.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN LAYOUT: controls + preview (body content preserved) */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[0.95fr,1.15fr] lg:gap-6">
          {/* LEFT: layout + content controls */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm lg:p-5 dark:border-slate-800/80 dark:bg-slate-900/90">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Layout & content controls
                </h2>
                <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
                  Choose a template, pick which blocks to show, and decide where
                  SEO, specs, manuals, and FAQs should live. In production, this
                  talks directly to your Avidia content API.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
                Visual only — API wiring later
              </span>
            </header>

            <form className="space-y-3 text-xs">
              {/* Template selector */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-slate-800 dark:text-slate-200">
                  Page template
                </label>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                  defaultValue="conversion"
                >
                  <option value="conversion">Conversion-focused (default)</option>
                  <option value="technical">Technical buyers</option>
                  <option value="visual">Visual storytelling</option>
                </select>
              </div>

              {/* Brand & channel */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-slate-800 dark:text-slate-200">
                    Brand / storefront
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                    defaultValue="medicalex"
                  >
                    <option value="medicalex">MedicalEx (BigCommerce)</option>
                    <option value="demo-bc">Demo store (BigCommerce)</option>
                    <option value="generic">Generic theme</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-slate-800 dark:text-slate-200">
                    Target channel
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 focus:border-fuchsia-400 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                    defaultValue="desktop"
                  >
                    <option value="desktop">Desktop layout</option>
                    <option value="mobile">Mobile-first</option>
                    <option value="marketplace">Marketplace detail page</option>
                  </select>
                </div>
              </div>

              {/* Blocks toggles */}
              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-slate-800 dark:text-slate-200">
                  Page blocks
                </label>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Select which blocks to include. AvidiaStudio will map your
                  existing content (H1, description, specs, manuals, FAQs) into
                  this structure.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {layoutBlocks.map((label, index) => (
                    <label
                      key={label}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white/90 px-3 py-1.5 hover:border-fuchsia-500/40 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/80 dark:hover:bg-slate-900/90"
                    >
                      <input
                        type="checkbox"
                        defaultChecked={index < 4}
                        className="h-3 w-3 rounded border border-slate-400 bg-white text-fuchsia-400 focus:ring-fuchsia-500/40 dark:border-slate-500 dark:bg-slate-900"
                      />
                      <span className="text-[11px] text-slate-700 dark:text-slate-200">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* CTA behavior */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-slate-800 dark:text-slate-200">
                    Primary CTA behavior
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                    defaultValue="add"
                  >
                    <option value="add">Add to cart</option>
                    <option value="quote">Request a quote</option>
                    <option value="contact">Contact sales</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-slate-800 dark:text-slate-200">
                    Secondary CTA
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
                    defaultValue="manuals"
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-500 px-3.5 py-2 text-xs font-semibold text-slate-50 shadow-md shadow-fuchsia-500/40 transition hover:-translate-y-[1px] hover:bg-fuchsia-400"
                >
                  Apply layout to preview
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900/90 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-100 hover:border-sky-400/60 hover:text-sky-100 hover:bg-slate-900 transition dark:bg-slate-950"
                >
                  Save as Studio preset
                </button>
                <span className="text-[10px] text-slate-500 dark:text-slate-500">
                  Later, this will save layouts per brand / category and sync
                  them into your automation flows.
                </span>
              </div>
            </form>
          </div>

          {/* RIGHT: live-ish preview */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm lg:p-5 dark:border-slate-800/80 dark:bg-slate-900/90">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Live preview frame
                </h2>
                <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
                  See a mocked-up product page that follows your current
                  template and block selection. In production, this would render
                  real HTML that matches your storefront theme.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-[2px] dark:border-slate-700 dark:bg-slate-950/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Preview only</span>
                </div>
                <div className="flex gap-1">
                  <span className="inline-flex h-6 w-8 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-[10px] dark:border-slate-700 dark:bg-slate-900">
                    ▯
                  </span>
                  <span className="inline-flex h-6 w-8 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-[10px] dark:border-slate-700 dark:bg-slate-900">
                    ▮
                  </span>
                </div>
              </div>
            </header>

            {/* Mocked page preview */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 shadow-inner dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
              {/* Top bar */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>MedicalEx • Product detail (preview)</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Studio view — not live
                </span>
              </div>

              {/* Body */}
              <div className="space-y-4 px-5 py-4">
                {/* Hero block */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.2fr),minmax(0,0.9fr)] md:gap-6">
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      BRAND • CATEGORY
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                      Example IV Stand with Adjustable Height and Heavy-Duty
                      Base
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Compact product summary based on your AvidiaDescribe /
                      AvidiaSEO content. Keeps brand voice, regulatory notes,
                      and top features in the first screen.
                    </p>
                    <ul className="mt-2 space-y-1 list-inside list-disc text-xs text-slate-700 dark:text-slate-300">
                      <li>Height-adjustable pole for flexible use.</li>
                      <li>Stable, weighted base suitable for clinical settings.</li>
                      <li>Compatible with standard infusion accessories.</li>
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500">
                        Add to cart
                      </button>
                      <button className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-50 dark:bg-slate-800">
                        View manuals & downloads
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex-1 items-center justify-center rounded-xl border border-slate-300 bg-slate-200 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Image gallery placeholder
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-14 rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-800"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Specs + downloads + FAQ blocks (simplified) */}
                <div className="mt-3 grid grid-cols-1 gap-4 border-t border-slate-200 pt-2 dark:border-slate-700 md:grid-cols-3">
                  <div className="md:col-span-1">
                    <h4 className="mb-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                      Specifications
                    </h4>
                    <ul className="space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                      <li>Height range: 120–220 cm</li>
                      <li>Base type: 5-leg, low profile</li>
                      <li>Weight capacity: 10 kg</li>
                      <li>Material: Stainless steel</li>
                    </ul>
                  </div>
                  <div className="md:col-span-1">
                    <h4 className="mb-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                      Manuals & downloads
                    </h4>
                    <ul className="space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                      <li>
                        <span className="underline">
                          IFU – Setup & operation (PDF)
                        </span>
                      </li>
                      <li>
                        <span className="underline">
                          Cleaning & disinfection guide (PDF)
                        </span>
                      </li>
                      <li>
                        <span className="underline">
                          Warranty & service terms (PDF)
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="md:col-span-1">
                    <h4 className="mb-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
                      FAQs
                    </h4>
                    <ul className="space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                      <li>Is this stand compatible with infusion pumps?</li>
                      <li>What cleaning agents are recommended?</li>
                      <li>Does it ship fully assembled?</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Publishing note */}
            <div className="flex items-start gap-2 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <p>
                In a live version,{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Publish from Studio
                </span>{" "}
                would push this layout + content to your connected store (for
                example, a BigCommerce product ID) via your Avidia automation
                layer.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
