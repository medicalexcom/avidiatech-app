import React from "react";
import DescribeForm from "@/components/describe/DescribeForm";
import DescribeOutput from "@/components/describe/DescribeOutput";

/**
 * Server page for /dashboard/describe
 * - Premium two-panel layout: DescribeForm (client) + DescribeOutput (client)
 * - Hero row focuses on "from rough notes to production-ready SEO" story.
 */

export default async function DescribePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Background treatment */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-24 h-80 w-80 rounded-full bg-fuchsia-300/20 blur-3xl dark:bg-fuchsia-500/15" />
        <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/15" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-8 lg:px-8 lg:pt-6 lg:pb-10">
        {/* HERO (no framed banner, open row like Translate) */}
        <section className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          {/* LEFT: identity + story */}
          <div className="min-w-[260px] flex-1 space-y-6">
            {/* Identity row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/50 bg-white/90 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-fuchsia-700 shadow-sm dark:border-fuchsia-500/50 dark:bg-slate-950/90 dark:text-fuchsia-100">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-fuchsia-400/70 bg-slate-100 dark:bg-slate-900">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-fuchsia-400" />
                </span>
                AvidiaTech • AvidiaDescribe
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Render + GPT • Custom instructions
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700 shadow-sm dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100">
                ✨ From rough notes to production copy
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-xl font-semibold leading-tight text-slate-900 lg:text-2xl dark:text-slate-50">
                Describe the product in{" "}
                <span className="bg-gradient-to-r from-fuchsia-500 via-pink-500 to-sky-500 bg-clip-text text-transparent dark:from-fuchsia-300 dark:via-pink-300 dark:to-sky-300">
                  your own words
                </span>
                . We turn it into a store-ready page.
              </h1>
              <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
                Type a few lines of context — model, audience, key claims,
                disclaimers. AvidiaDescribe runs your custom instructions and
                returns SEO-ready copy that matches your brands and channels.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-sky-200 bg-white/90 px-3 py-3 text-[11px] text-slate-700 shadow-sm dark:border-sky-400/50 dark:bg-slate-950/90 dark:text-slate-100">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-200">
                  Example input
                </p>
                <p className="leading-relaxed">
                  “Lightweight aluminum walker with wheels, good for small apartments, need to highlight safety and Medicare coverage.”
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white/90 px-3 py-3 text-[11px] text-slate-700 shadow-sm dark:border-emerald-400/50 dark:bg-slate-950/90 dark:text-slate-100">
                <p className="mb-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  AvidiaDescribe Output
                </p>
                <ul className="list-inside list-disc space-y-1">
                  <li>Structured H1, page title & meta</li>
                  <li>Benefit-first feature bullets</li>
                  <li>Compliance and disclaimers baked in</li>
                </ul>
              </div>
            </div>

            {/* Value props */}
            <div className="flex flex-wrap gap-3 text-[11px]">
              <div className="inline-flex items-start gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/90">
                <div className="mt-[2px] flex h-5 w-5 items-center justify-center rounded-lg border border-fuchsia-400/60 bg-fuchsia-100 text-[12px] text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-slate-50">
                  1
                </div>
                <div className="space-y-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">
                    Works from tiny prompts
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">
                    Bullet points, loose paragraphs, even sales notes become
                    structured descriptions.
                  </p>
                </div>
              </div>

              <div className="inline-flex items-start gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/90">
                <div className="mt-[2px] flex h-5 w-5 items-center justify-center rounded-lg border border-sky-400/60 bg-sky-100 text-[12px] text-sky-700 dark:bg-sky-500/15 dark:text-slate-50">
                  2
                </div>
                <div className="space-y-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">
                    Enforces your rules
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">
                    H1, meta, bullets, manuals, disclaimers — all shaped by
                    the same instruction sheet you use elsewhere.
                  </p>
                </div>
              </div>

              <div className="inline-flex items-start gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/90">
                <div className="mt-[2px] flex h-5 w-5 items-center justify-center rounded-lg border border-emerald-400/60 bg-emerald-100 text-[12px] text-emerald-700 dark:bg-emerald-500/15 dark:text-slate-50">
                  3
                </div>
                <div className="space-y-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">
                    Multi-channel friendly
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">
                    Output works for BigCommerce, your JSON pipelines,
                    marketplaces and print sheets.
                  </p>
                </div>
              </div>
            </div>

            {/* Steps + hint */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/50 bg-white/95 px-3 py-1.5 shadow-sm dark:border-fuchsia-400/40 dark:bg-slate-950/90">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fuchsia-700 dark:text-fuchsia-200">
                  Step 1
                </span>
                <span className="text-[11px] text-slate-700 dark:text-slate-300">
                  Fill the{" "}
                  <span className="font-semibold text-fuchsia-700 dark:text-fuchsia-200">
                    Describe panel on the left
                  </span>{" "}
                  with a few sentences.
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-200">
                  Step 2
                </span>
                <span className="text-[11px] text-slate-700 dark:text-slate-300">
                  Review the live{" "}
                  <span className="font-semibold text-sky-600 dark:text-sky-200">
                    description canvas
                  </span>{" "}
                  on the right.
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: static "Describe engine" snapshot */}
          <div className="mt-4 w-full lg:mt-0 lg:w-[420px] xl:w-[480px]">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-[0_0_60px_rgba(148,163,184,0.35)] dark:border-slate-700/80 dark:bg-slate-950/90 dark:shadow-[0_0_60px_rgba(15,23,42,0.9)]">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Describe engine snapshot
                </p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Render + GPT stack
                </span>
              </div>

              {/* three lanes */}
              <div className="space-y-3 text-[11px]">
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <div className="mt-[2px] flex h-6 w-6 items-center justify-center rounded-lg border border-fuchsia-400/50 bg-white dark:bg-slate-950">
                    <span className="h-3 w-3 rounded-full bg-fuchsia-400" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-900 dark:text-slate-50">
                      Input channel
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      Short notes, sales copy, tech specs, even support replies
                      — all acceptable inputs.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <div className="mt-[2px] flex h-6 w-6 items-center justify-center rounded-lg border border-sky-400/50 bg-white dark:bg-slate-950">
                    <span className="h-3 w-3 rounded-full bg-sky-400" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-900 dark:text-slate-50">
                      Instruction profile
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      Locks to your global custom GPT instructions: tone,
                      sections, SEO, disclaimers and manual links.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                  <div className="mt-[2px] flex h-6 w-6 items-center justify-center rounded-lg border border-emerald-400/50 bg-white dark:bg-slate-950">
                    <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-900 dark:text-slate-50">
                      Output canvas
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      Structured JSON + HTML that your BigCommerce / AvidiaSEO
                      flows can consume immediately.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tiny "profiles" row */}
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="min-w-[130px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Brand profiles
                  </p>
                  <p className="text-[11px] text-slate-700 dark:text-slate-200">
                    MedicalEx, BD, UMF and more — Describe respects your
                    brand-specific rules.
                  </p>
                </div>
                <div className="min-w-[130px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Channels
                  </p>
                  <p className="text-[11px] text-slate-700 dark:text-slate-200">
                    Product page, marketplace, email — one source of truth,
                    multiple surfaces.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN LAYOUT: DescribeForm + DescribeOutput */}
        <section className="grid grid-cols-12 gap-6">
          {/* Left: inputs */}
          <div className="col-span-12 lg:col-span-5">
            <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/80 lg:p-5 dark:border-slate-700/70 dark:bg-slate-900/85 dark:shadow-xl dark:shadow-slate-950/70">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Describe input
                </h2>
                <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                  Give AvidiaDescribe a few sentences about the product,
                  audience, and claims. The more specific, the better the SEO
                  and structure.
                </p>
              </div>
              <div className="min-h-[260px] flex-1">
                <DescribeForm />
              </div>
            </div>
          </div>

          {/* Right: output */}
          <div className="col-span-12 lg:col-span-7">
            <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/90 lg:p-5 dark:border-slate-700/70 dark:bg-slate-900/90 dark:shadow-2xl dark:shadow-slate-950/80">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Live description canvas
                  </h2>
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    See your custom-instruction description exactly how it will
                    ship — headers, bullets, disclaimers, and SEO metadata
                    included.
                  </p>
                </div>
                <div className="hidden flex-col items-end gap-1 sm:flex">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] text-emerald-700 shadow-sm dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Ready for export
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-500">
                    Mirror this in AvidiaSEO or your ingest flows.
                  </span>
                </div>
              </div>
              <div className="min-h-[260px] flex-1">
                <DescribeOutput />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
