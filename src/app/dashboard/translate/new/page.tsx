"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageShell, { PageHeader } from "@/components/layout/PageShell";

const LANGUAGES = [
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "ar", name: "Arabic" },
  { code: "pl", name: "Polish" },
  { code: "sv", name: "Swedish" },
];

export default function NewTranslationPage() {
  const router = useRouter();
  const [targetLang, setTargetLang] = useState("es");
  const [jobName, setJobName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLang, jobName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create translation job");
      router.push("/dashboard/translate");
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell glow="sky">
      <PageHeader
        glow="sky"
        kicker="Translate"
        dot="bg-sky-500"
        title={
          <>
            Create a{" "}
            <span className="bg-gradient-to-r from-sky-500 to-cyan-400 bg-clip-text text-transparent">
              translation job
            </span>
          </>
        }
        description="Choose a target language and we'll translate your product content — titles, descriptions, SEO copy — at scale."
      />

      {/* Back link */}
      <div>
        <Link
          href="/dashboard/translate"
          className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Back to Translate
        </Link>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-2xl border border-red-200/80 bg-red-50/80 px-5 py-3 dark:border-red-500/25 dark:bg-red-500/8">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-red-700 dark:text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-sm ml-4">✕</button>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-card dark:border-slate-800 dark:bg-slate-900/80 space-y-5">

          {/* Job name */}
          <div className="space-y-1.5">
            <label htmlFor="jobName" className="block text-[13px] font-semibold text-slate-800 dark:text-slate-200">
              Job name <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="jobName"
              type="text"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="e.g. Q2 Spanish catalog"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder-slate-400 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
            />
          </div>

          {/* Target language */}
          <div className="space-y-1.5">
            <label htmlFor="targetLang" className="block text-[13px] font-semibold text-slate-800 dark:text-slate-200">
              Target language
            </label>
            <select
              id="targetLang"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <p className="text-[12px] text-slate-400 dark:text-slate-500">
              All eligible products in your catalog will be translated. You can filter by tag or collection after the job runs.
            </p>
          </div>

          {/* Info box */}
          <div className="rounded-xl border border-sky-200/80 bg-sky-50/60 px-4 py-3 dark:border-sky-500/20 dark:bg-sky-500/8">
            <p className="text-[12px] text-sky-800 dark:text-sky-300">
              Translation jobs run asynchronously. You'll receive a notification when the job is complete and can review results from the Translate dashboard.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/dashboard/translate"
            className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-9 items-center rounded-xl bg-sky-500 px-5 text-[13px] font-semibold text-white shadow-sm shadow-sky-500/30 transition hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating…" : "Create translation job"}
          </button>
        </div>
      </form>
    </PageShell>
  );
}
