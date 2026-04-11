"use client";

import React, { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";

// ─── Types ────────────────────────────────────────────────────────────────────
interface VariantOption {
  name: string;
  values: string[];
}

interface VariantFamily {
  id: string;
  parentName: string;
  sku: string;
  options: VariantOption[];
  members: { sku: string; name: string; attrs: Record<string, string> }[];
  approved: boolean;
}

/* Variant families are fetched from the API on mount */

// ─── Family card ──────────────────────────────────────────────────────────────
function FamilyCard({
  family,
  expanded,
  onToggle,
  onApprove,
  onReject,
  onExport,
}: {
  family: VariantFamily;
  expanded: boolean;
  onToggle: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onExport: (id: string) => void;
}) {
  return (
    <div className={`rounded-xl border bg-slate-50 transition-all dark:bg-slate-950/80 ${family.approved ? "border-emerald-300/60 dark:border-emerald-500/40" : "border-slate-200 dark:border-slate-800"}`}>
      <button className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left" onClick={onToggle}>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-semibold text-slate-900 dark:text-slate-50">{family.parentName}</p>
            {family.approved && (
              <span className="rounded-full border border-emerald-300/60 bg-emerald-50 px-2 py-0.5 text-[9px] font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                ✓ Approved
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            SKU: {family.sku} · {family.members.length} variants · {family.options.map((o) => o.name).join(" × ")}
          </p>
        </div>
        <svg className={`mt-1 h-3.5 w-3.5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800">
          {/* Options */}
          <div className="mb-3 space-y-1.5">
            {family.options.map((opt) => (
              <div key={opt.name} className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-medium text-slate-700 dark:text-slate-200">{opt.name}:</span>
                {opt.values.map((v) => (
                  <span key={v} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">{v}</span>
                ))}
              </div>
            ))}
          </div>

          {/* Members table */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-slate-100 bg-slate-100 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <span>Variant</span>
              <span>SKU</span>
            </div>
            {family.members.map((m) => (
              <div key={m.sku} className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-slate-100 px-3 py-2 text-[11px] last:border-0 dark:border-slate-800">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{m.name}</p>
                  <p className="text-[10px] text-slate-400">{Object.entries(m.attrs).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
                </div>
                <span className="font-mono text-slate-500 dark:text-slate-400">{m.sku}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            {!family.approved && (
              <button onClick={() => onApprove(family.id)} className="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-300">
                ✓ Approve family
              </button>
            )}
            <button onClick={() => onReject(family.id)} className="rounded-full border border-rose-400/60 bg-rose-50 px-3 py-1 text-[11px] font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
              Discard
            </button>
            <button onClick={() => onExport(family.id)} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              Export CSV
            </button>
            <button className="rounded-full border border-sky-400/60 bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-700 transition hover:bg-sky-500/20 dark:text-sky-300">
              Sync to store
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function VariantsPage() {
  const [families, setFamilies] = useState<VariantFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");

  useEffect(() => {
    fetch("/api/v1/pipeline/runs?module=variants&limit=50")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.runs) && data.runs.length > 0) {
          setFamilies(
            data.runs.map((r: any) => ({
              id: r.id,
              parentName: r.parent_name ?? r.product_name ?? "Unknown",
              sku: r.sku ?? "",
              options: r.options ?? [],
              members: r.members ?? [],
              approved: r.approved ?? false,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function runDetection() {
    setRunning(true);
    try {
      const res = await fetch("/api/v1/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: "variants" }),
      });
      const json = await res.json();
      if (json.ok && Array.isArray(json.families)) {
        setFamilies(json.families);
      }
      showToast(`Variant detection complete — ${json.families?.length ?? 0} families found.`);
    } catch {
      showToast("Variant detection failed — check connection");
    } finally {
      setRunning(false);
    }
  }

  function onApprove(id: string) {
    setFamilies((prev) => prev.map((f) => f.id === id ? { ...f, approved: true } : f));
    showToast("Variant family approved and queued for sync.");
  }

  function onReject(id: string) {
    setFamilies((prev) => prev.filter((f) => f.id !== id));
    showToast("Variant family discarded.");
  }

  function onExport(id: string) {
    const family = families.find((f) => f.id === id);
    if (!family) return;
    const csv = ["SKU,Name," + family.options.map((o) => o.name).join(","),
      ...family.members.map((m) => [m.sku, `"${m.name}"`, ...family.options.map((o) => `"${m.attrs[o.name] ?? ""}"`).join(",")].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${family.sku}-variants.csv`;
    a.click();
    showToast("CSV downloaded.");
  }

  const displayed = families.filter((f) => filter === "all" || (filter === "approved" ? f.approved : !f.approved));
  const approvedCount = families.filter((f) => f.approved).length;
  const totalVariants = families.reduce((s, f) => s + f.members.length, 0);

  return (
    <PageShell glow="rose">
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 shadow-lg dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200">
          {toast}
        </div>
      )}

      <>
        {/* HEADER */}
        <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
              Commerce &amp; Automation · AvidiaVariants
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight dark:text-slate-50">
                Turn scattered SKUs into{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 dark:from-amber-300 dark:via-amber-200 dark:to-yellow-300">
                  clean variant families
                </span>.
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Detect, review, and approve variant groups. Export clean structures to your store or feeds.
              </p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Families", value: families.length, color: "#f59e0b" },
              { label: "Approved", value: approvedCount, color: "#10b981" },
              { label: "Total variants", value: totalVariants, color: "#6366f1" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white/95 px-4 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 text-center min-w-[72px]">
                <p className="text-xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={runDetection}
            disabled={running}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_8px_24px_rgba(251,191,36,0.45)] transition hover:-translate-y-px hover:bg-amber-400 disabled:opacity-70"
          >
            {running ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Detecting…
              </>
            ) : "Run variant detection"}
          </button>

          <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            {(["all", "pending", "approved"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-[11px] font-medium capitalize transition ${
                  filter === f
                    ? "bg-amber-500 text-slate-950"
                    : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const all = families.filter((f) => !f.approved);
              setFamilies((prev) => prev.map((f) => ({ ...f, approved: true })));
              showToast(`${all.length} families approved.`);
            }}
            className="rounded-lg border border-emerald-300/60 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            Approve all
          </button>
        </div>

        {/* Family list */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 py-12 text-center dark:border-slate-800">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500" />
              <p className="text-sm text-slate-500">Loading variant families…</p>
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-800">
              <span className="text-3xl">📦</span>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No variant families yet</p>
              <p className="text-[11px] text-slate-500">Click "Run variant detection" to propose families from your catalog.</p>
            </div>
          ) : (
            displayed.map((f) => (
              <FamilyCard
                key={f.id}
                family={f}
                expanded={expandedId === f.id}
                onToggle={() => setExpandedId((p) => p === f.id ? null : f.id)}
                onApprove={onApprove}
                onReject={onReject}
                onExport={onExport}
              />
            ))
          )}
        </div>

        {/* Info panel */}
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">How AvidiaVariants works</h3>
          <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            {[
              ["Sync your catalog", "Pull products from AvidiaExtract or your commerce platform into a variant-ready workspace."],
              ["Detect and propose groups", "Analyzes titles, attributes, MPNs, and GTINs to propose variant families with suggested option names."],
              ["Approve and sync back", "Approve or tweak variant groups, then push to your store or feeds with consistent option structures."],
            ].map(([title, desc], i) => (
              <li key={i} className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700 dark:bg-slate-800 dark:text-amber-300">{i + 1}</div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </>
    </PageShell>
  );
}
