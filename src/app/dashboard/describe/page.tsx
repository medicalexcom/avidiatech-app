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
    <main className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
      {/* Background treatment */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-24 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-fuchsia-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_0_120px_rgba(236,72,153,0.28)] p-6 lg:p-8">
          {/* Subtle grid */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
            <div className="h-full w-full bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:46px_46px]" />
          </div>

          {/* Floating cards */}
          <div className="pointer-events-none absolute -right-10 top-10 hidden xl:block">
            <div className="rounded-2xl border border-sky-500/30 bg-slate-950/90 shadow-[0_0_60px_rgba(56,189,248,0.4)] px-4 py-3 w-60 rotate-3">
              <p className="text-[11px] text-slate-400 uppercase tracking-[0.18em] mb-1">
                Example input
              </p>
              <p className="text-[11px] text-slate-100 leading-relaxed">
                “Lightweight aluminum walker with wheels, good for small
                apartments, need to highlight safety and Medicare coverage.”
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-4 bottom-6 hidden xl:block">
            <div className="rounded-2xl border border-emerald-400/40 bg-slate-950/95 shadow-[0_0_60px_rgba(16,185,129,0.4)] px-4 py-3 w-64 -rotate-2">
              <p className="text-[11px] text-emerald-300 font-semibold mb-1">
                AvidiaDescribe Output
              </p>
              <ul className="text-[11px] text-slate-100 space-y-1 list-disc list-inside">
                <li>Structured H1, page title & meta</li>
                <li>Benefit-first feature bullets</li>
                <li>Compliance and disclaimers baked in</li>
              </ul>
            </div>
          </div>

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-stretch">
            {/* LEFT: identity + story */}
            <div className="flex-1 min-w-[260px] space-y-6">
              {/* Identity row */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/50 bg-slate-950/90 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-fuchsia-100">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 border border-fuchsia-400/70">
                    <span className="h-2 w-2 rounded-full bg-fuchsia-400 animate-pulse" />
                  </span>
                  AvidiaTech • AvidiaDescribe
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/90 border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Render + GPT • Custom instructions
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-400/40 px-2.5 py-1 text-[11px] text-amber-100">
                  ✨ From rough notes to production copy
                </span>
              </div>

              {/* Headline */}
              <div className="space-y-3">
                <h1 className="text-3xl lg:text-4xl font-semibold leading-tight text-slate-50">
                  Describe the product in{" "}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-300 via-pink-300 to-sky-300">
                    your own words
                  </span>
                  . We turn it into a store-ready page.
                </h1>
                <p className="text-sm text-slate-300 max-w-xl">
                  Type a few lines of context — model, audience, key claims,
                  disclaimers. AvidiaDescribe runs your custom instructions and
                  returns SEO-ready copy that matches your brands and channels.
                </p>
              </div>

              {/* Value props */}
              <div className="flex flex-wrap gap-3 text-[11px]">
                <div className="inline-flex items-start gap-2 rounded-xl bg-slate-950/90 border border-slate-700/70 px-3 py-2">
                  <div className="mt-[2px] h-5 w-5 rounded-lg bg-fuchsia-500/15 border border-fuchsia-400/60 flex items-center justify-center text-[12px]">
                    1
                  </div>
                  <div className="space-y-0">
                    <p className="font-semibold text-slate-50">
                      Works from tiny prompts
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      Bullet points, loose paragraphs, even sales notes become
                      structured descriptions.
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-start gap-2 rounded-xl bg-slate-950/90 border border-slate-700/70 px-3 py-2">
                  <div className="mt-[2px] h-5 w-5 rounded-lg bg-sky-500/15 border border-sky-400/60 flex items-center justify-center text-[12px]">
                    2
                  </div>
                  <div className="space-y-0">
                    <p className="font-semibold text-slate-50">
                      Enforces your rules
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      H1, meta, bullets, manuals, disclaimers — all shaped by
                      the same instruction sheet you use elsewhere.
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-start gap-2 rounded-xl bg-slate-950/90 border border-slate-700/70 px-3 py-2">
                  <div className="mt-[2px] h-5 w-5 rounded-lg bg-emerald-500/15 border border-emerald-400/60 flex items-center justify-center text-[12px]">
                    3
                  </div>
                  <div className="space-y-0">
                    <p className="font-semibold text-slate-50">
                      Multi-channel friendly
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      Output works for BigCommerce, your JSON pipelines,
                      marketplaces and print sheets.
                    </p>
                  </div>
                </div>
              </div>

              {/* Steps + hint */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-fuchsia-400/40 px-3 py-1.5">
                  <span className="text-[11px] font-semibold text-fuchsia-200 uppercase tracking-[0.16em]">
                    Step 1
                  </span>
                  <span className="text-[11px] text-slate-300">
                    Fill the{" "}
                    <span className="font-semibold text-fuchsia-200">
                      Describe panel on the left
                    </span>{" "}
                    with a few sentences.
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-slate-700 px-3 py-1.5">
                  <span className="text-[11px] font-semibold text-sky-200 uppercase tracking-[0.16em]">
                    Step 2
                  </span>
                  <span className="text-[11px] text-slate-300">
                    Review the live{" "}
                    <span className="font-semibold text-sky-200">
                      description canvas
                    </span>{" "}
                    on the right.
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT: static "Describe brain" panel */}
            <div className="w-full lg:w-[420px] xl:w-[480px] mt-4 lg:mt-0">
              <div className="rounded-2xl bg-slate-950/90 border border-slate-700/80 shadow-[0_0_60px_rgba(15,23,42,0.9)] px-4 py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    Describe engine snapshot
                  </p>
                  <span className="text-[11px] text-slate-400">
                    Render + GPT stack
                  </span>
                </div>

                {/* three lanes */}
                <div className="space-y-3 text-[11px]">
                  <div className="flex items-start gap-3 rounded-xl bg-slate-900/80 border border-slate-700 px-3 py-2">
                    <div className="mt-[2px] h-6 w-6 rounded-lg bg-slate-950 flex items-center justify-center border border-fuchsia-400/50">
                      <span className="h-3 w-3 rounded-full bg-fuchsia-400" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-50">
                        Input channel
                      </p>
                      <p className="text-slate-400">
                        Short notes, sales copy, tech specs, even support
                        replies — all acceptable inputs.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-slate-900/80 border border-slate-700 px-3 py-2">
                    <div className="mt-[2px] h-6 w-6 rounded-lg bg-slate-950 flex items-center justify-center border border-sky-400/50">
                      <span className="h-3 w-3 rounded-full bg-sky-400" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-50">
                        Instruction profile
                      </p>
                      <p className="text-slate-400">
                        Locks to your global custom GPT instructions: tone,
                        sections, SEO, disclaimers and manual links.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-slate-900/80 border border-slate-700 px-3 py-2">
                    <div className="mt-[2px] h-6 w-6 rounded-lg bg-slate-950 flex items-center justify-center border border-emerald-400/50">
                      <span className="h-3 w-3 rounded-full bg-emerald-400" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-50">
                        Output canvas
                      </p>
                      <p className="text-slate-400">
                        Structured JSON + HTML that your BigCommerce / AvidiaSEO
                        flows can consume immediately.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tiny "profiles" row */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <div className="flex-1 min-w-[130px] rounded-xl bg-slate-900/70 border border-slate-700 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-1">
                      Brand profiles
                    </p>
                    <p className="text-[11px] text-slate-200">
                      MedicalEx, BD, UMF and more — Describe respects your
                      brand-specific rules.
                    </p>
                  </div>
                  <div className="flex-1 min-w-[130px] rounded-xl bg-slate-900/70 border border-slate-700 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 mb-1">
                      Channels
                    </p>
                    <p className="text-[11px] text-slate-200">
                      Product page, marketplace, email — one source of truth,
                      multiple surfaces.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN LAYOUT: DescribeForm + DescribeOutput */}
        <section className="grid grid-cols-12 gap-6">
          {/* Left: inputs */}
          <div className="col-span-12 lg:col-span-5">
            <div className="h-full rounded-2xl bg-slate-900/85 border border-slate-700/70 shadow-xl shadow-slate-950/70 p-4 lg:p-5 flex flex-col">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-50">
                  Describe input
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  Give AvidiaDescribe a few sentences about the product,
                  audience, and claims. The more specific, the better the SEO
                  and structure.
                </p>
              </div>
              <div className="flex-1 min-h-[260px]">
                <DescribeForm />
              </div>
            </div>
          </div>

          {/* Right: output */}
          <div className="col-span-12 lg:col-span-7">
            <div className="h-full rounded-2xl bg-slate-900/90 border border-slate-700/70 shadow-2xl shadow-slate-950/80 p-4 lg:p-5 flex flex-col">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-50">
                    Live description canvas
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-1">
                    See your custom-instruction description exactly how it will
                    ship — headers, bullets, disclaimers, and SEO metadata
                    included.
                  </p>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/90 border border-slate-700 px-2.5 py-1 text-[10px] text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Ready for export
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Mirror this in AvidiaSEO or your ingest flows.
                  </span>
                </div>
              </div>
              <div className="flex-1 min-h-[260px]">
                <DescribeOutput />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
