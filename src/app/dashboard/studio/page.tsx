"use client";

/**
 * Studio product page
 *
 * AvidiaStudio is an interactive design tool for customizing and publishing
 * product pages. It puts you in control of content and layout.
 */

import React from "react";

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
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 relative overflow-hidden">
      {/* Background gradients + grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-24 h-80 w-80 rounded-full bg-fuchsia-500/15 dark:bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-40 right-[-10rem] h-[24rem] w-[24rem] rounded-full bg-sky-500/10 dark:bg-sky-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.96)_40%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        {/* HERO ROW */}
        <section className="relative overflow-hidden rounded-3xl border border-fuchsia-500/40 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 shadow-[0_0_80px_rgba(236,72,153,0.25)] px-5 py-6 lg:px-7 lg:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Left copy */}
            <div className="flex-1 min-w-[260px] space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-50/90 border border-fuchsia-500/60 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-950/90 dark:text-slate-300">
                <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-slate-100 border border-fuchsia-400/80 dark:bg-slate-900">
                  <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
                </span>
                AvidiaStudio • Page designer
                <span className="h-1 w-px bg-slate-300 dark:bg-slate-600" />
                <span className="rounded-full bg-amber-500/10 px-2 py-[2px] text-[9px] font-semibold text-amber-700 border border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-200">
                  Coming soon
                </span>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl lg:text-3xl font-semibold leading-tight text-slate-900 dark:text-slate-50">
                  Design{" "}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 via-cyan-500 to-sky-500 dark:from-fuchsia-300 dark:via-cyan-300 dark:to-sky-300">
                    conversion-ready product pages
                  </span>{" "}
                  without leaving your data stack.
                </h1>
                <p className="text-sm text-slate-600 max-w-xl dark:text-slate-300">
                  AvidiaStudio sits on top of Extract, Describe, and SEO so you
                  can adjust copy, rearrange blocks, and preview layout before
                  syncing to BigCommerce, WooCommerce, or your CMS.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-[11px]">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-50/90 border border-cyan-500/40 px-3 py-1.5 text-slate-700 dark:bg-slate-950/90 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>
                    Pulls structured content from AvidiaExtract / AvidiaSEO.
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-50/90 border border-fuchsia-500/40 px-3 py-1.5 text-slate-700 dark:bg-slate-950/90 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                  <span>
                    Drag blocks, tweak copy, and keep your brand intact.
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-50/90 border border-sky-500/40 px-3 py-1.5 text-slate-700 dark:bg-slate-950/90 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>
                    One click to publish back to your store or CMS.
                  </span>
                </div>
              </div>
            </div>

            {/* Right: layout preset snapshot */}
            <div className="w-full lg:w-[360px] xl:w-[400px] mt-4 lg:mt-0">
              <div className="rounded-2xl bg-white/95 border border-slate-200 px-4 py-4 space-y-3 shadow-sm dark:bg-slate-950/95 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
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
                      className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 flex flex-col gap-1 dark:bg-slate-900/90 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {tpl.name}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-300 px-2 py-[2px] text-[9px] text-slate-500 dark:bg-slate-950/90 dark:border-slate-700 dark:text-slate-300">
                          Preset
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {tpl.desc}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 pt-1 dark:text-slate-500">
                  Later, tenants will be able to define reusable page templates
                  and map them to product types, brands, or categories.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN LAYOUT: controls + preview */}
        <section className="grid grid-cols-1 lg:grid-cols-[0.95fr,1.15fr] gap-5 lg:gap-6">
          {/* LEFT: layout + content controls */}
          <div className="rounded-2xl bg-white/90 border border-slate-200 p-4 lg:p-5 space-y-4 shadow-sm dark:bg-slate-900/90 dark:border-slate-800/80">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Layout & content controls
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-md dark:text-slate-400">
                  Choose a template, pick which blocks to show, and decide where
                  SEO, specs, manuals, and FAQs should live on the page. In
                  production, this would talk directly to your Avidia content
                  API.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-slate-100/90 border border-slate-300 px-2.5 py-1 text-[10px] text-slate-500 dark:bg-slate-950/90 dark:border-slate-700 dark:text-slate-300">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  Select which blocks to include on the page. AvidiaStudio will
                  map your existing content (H1, description, specs, manuals,
                  FAQs) into this structure.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {layoutBlocks.map((label, index) => (
                    <label
                      key={label}
                      className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white/90 px-3 py-1.5 hover:border-fuchsia-500/40 hover:bg-slate-50 cursor-pointer dark:border-slate-700 dark:bg-slate-950/80 dark:hover:bg-slate-900/90"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-500 px-3.5 py-2 text-xs font-semibold text-slate-50 shadow-md shadow-fuchsia-500/40 hover:bg-fuchsia-400 hover:-translate-y-[1px] transition"
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
          <div className="rounded-2xl bg-white/90 border border-slate-200 p-4 lg:p-5 space-y-4 shadow-sm dark:bg-slate-900/90 dark:border-slate-800/80">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Live preview frame
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-md dark:text-slate-400">
                  See a mocked-up product page that follows your current
                  template and block selection. In production, this would render
                  real HTML that matches your storefront theme.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 text-[10px] text-slate-400">
                <div className="inline-flex items-center gap-1 rounded-full bg-slate-100/90 border border-slate-300 px-2 py-[2px] dark:bg-slate-950/90 dark:border-slate-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Preview only</span>
                </div>
                <div className="flex gap-1">
                  <span className="inline-flex h-6 w-8 items-center justify-center rounded-md bg-slate-100 border border-slate-300 text-[10px] dark:bg-slate-900 dark:border-slate-700">
                    ▯
                  </span>
                  <span className="inline-flex h-6 w-8 items-center justify-center rounded-md bg-slate-100 border border-slate-300 text-[10px] dark:bg-slate-900 dark:border-slate-700">
                    ▮
                  </span>
                </div>
              </div>
            </header>

            {/* Mocked page preview */}
            <div className="rounded-2xl bg-slate-50 text-slate-900 border border-slate-200 overflow-hidden shadow-inner dark:bg-slate-900 dark:text-slate-50 dark:border-slate-700">
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-100 dark:bg-slate-800 dark:border-slate-700">
                <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>MedicalEx • Product detail (preview)</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Studio view &mdash; not live
                </span>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-4">
                {/* Hero block */}
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr),minmax(0,0.9fr)] gap-4 md:gap-6">
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
                    <ul className="mt-2 text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
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
                    <div className="flex-1 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-[11px] text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                      Image gallery placeholder
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-14 rounded-lg bg-slate-200 border border-slate-300 dark:bg-slate-800 dark:border-slate-700"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Specs + downloads + FAQ blocks (simplified) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-200 mt-3 dark:border-slate-700">
                  <div className="md:col-span-1">
                    <h4 className="text-xs font-semibold text-slate-800 mb-1.5 dark:text-slate-100">
                      Specifications
                    </h4>
                    <ul className="text-[11px] text-slate-700 space-y-0.5 dark:text-slate-300">
                      <li>Height range: 120–220 cm</li>
                      <li>Base type: 5-leg, low profile</li>
                      <li>Weight capacity: 10 kg</li>
                      <li>Material: Stainless steel</li>
                    </ul>
                  </div>
                  <div className="md:col-span-1">
                    <h4 className="text-xs font-semibold text-slate-800 mb-1.5 dark:text-slate-100">
                      Manuals & downloads
                    </h4>
                    <ul className="text-[11px] text-slate-700 space-y-0.5 dark:text-slate-300">
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
                    <h4 className="text-xs font-semibold text-slate-800 mb-1.5 dark:text-slate-100">
                      FAQs
                    </h4>
                    <ul className="text-[11px] text-slate-700 space-y-0.5 dark:text-slate-300">
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
                In a live version, the{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Publish from Studio
                </span>{" "}
                action would push this layout + content to your connected store
                (e.g., BigCommerce product ID) via your Avidia automation layer.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
