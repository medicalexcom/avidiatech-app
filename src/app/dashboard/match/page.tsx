"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import UploadPastePanel from "./_components/UploadPastePanel";
import JobProgress from "./_components/JobProgress";
import MatchFilters from "./_components/MatchFilters";
import ResultsTable from "./_components/ResultsTable";
import BulkActions from "./_components/BulkActions";

/**
 * MatchPage — premium layout + efficient real estate + no horizontal overflow
 * + Shows selected upload file name + detected sheet name before proceeding.
 */

type PreviewRow = {
  row_id: string;
  supplier_name?: string;
  sku?: string;
  ndc_item_code?: string;
  product_name?: string;
  brand_name?: string;
  raw?: any;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function escapeCsv(value: any) {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : String(value);
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let b = bytes;
  let i = 0;
  while (b >= 1024 && i < units.length - 1) {
    b /= 1024;
    i += 1;
  }
  const val = i === 0 ? Math.round(b) : Math.round(b * 10) / 10;
  return `${val} ${units[i]}`;
}

function TinyChip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "signal" | "danger";
}) {
  const tones =
    tone === "signal"
      ? "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100"
      : tone === "success"
      ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100"
      : tone === "danger"
      ? "border-red-200/60 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-100"
      : "border-slate-200/70 bg-white/75 text-slate-600 dark:border-slate-700/70 dark:bg-slate-950/45 dark:text-slate-300";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] shadow-sm backdrop-blur whitespace-nowrap",
        tones
      )}
    >
      {children}
    </span>
  );
}

function StatPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "success" | "signal" | "danger";
}) {
  const tones =
    tone === "signal"
      ? "border-sky-200/70 bg-sky-50 text-sky-700 dark:border-sky-400/25 dark:bg-sky-500/10 dark:text-sky-100"
      : tone === "success"
      ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-100"
      : tone === "danger"
      ? "border-red-200/70 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-100"
      : "border-slate-200/70 bg-white/75 text-slate-700 dark:border-slate-700/70 dark:bg-slate-950/45 dark:text-slate-200";

  return (
    <div className={cx("rounded-2xl border px-3 py-2 shadow-sm backdrop-blur", tones)}>
      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
        {value}
      </div>
    </div>
  );
}

function SoftButton({
  onClick,
  href,
  children,
  variant = "secondary",
  disabled,
  className,
  title,
}: {
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition active:translate-y-[0.5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950 disabled:opacity-60 disabled:pointer-events-none";
  const cls =
    variant === "primary"
      ? cx(
          base,
          "text-slate-950 shadow-[0_16px_34px_-22px_rgba(2,6,23,0.55)]",
          "bg-gradient-to-r from-fuchsia-400 via-purple-500 to-sky-500",
          "hover:from-fuchsia-300 hover:via-purple-500 hover:to-sky-400",
          "focus-visible:ring-fuchsia-400/70",
          className
        )
      : variant === "ghost"
      ? cx(
          base,
          "border border-transparent bg-transparent text-slate-700 hover:bg-white/70 hover:border-slate-200/70",
          "dark:text-slate-200 dark:hover:bg-slate-950/35 dark:hover:border-slate-800/70",
          "focus-visible:ring-slate-300/70 dark:focus-visible:ring-slate-700/70",
          className
        )
      : cx(
          base,
          "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm",
          "hover:bg-white hover:text-slate-900",
          "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50",
          "focus-visible:ring-slate-300/70 dark:focus-visible:ring-slate-700/70",
          className
        );

  if (href) {
    return (
      <a href={href} className={cls} title={title} aria-disabled={disabled}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={cls} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

export default function MatchPage() {
  const featureEnabled = true;

  // upload / preview
  const [filePreviewRows, setFilePreviewRows] = useState<PreviewRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);

  // selected file + detected sheet
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileMeta, setSelectedFileMeta] = useState<{ size?: number; type?: string } | null>(null);
  const [detectedSheetName, setDetectedSheetName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // job / status
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any | null>(null);
  const [creatingJob, setCreatingJob] = useState(false);
  const [startingJob, setStartingJob] = useState(false);
  const [polling, setPolling] = useState(false);

  // results
  const [resultsRows, setResultsRows] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsStatusFilter, setResultsStatusFilter] = useState<string | undefined>(undefined);
  const [resultsLimit, setResultsLimit] = useState<number>(50);
  const [resultsOffset, setResultsOffset] = useState<number>(0);

  const clearSelectedFile = useCallback(() => {
    setSelectedFileName(null);
    setSelectedFileMeta(null);
    setDetectedSheetName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // parse file (xlsx/csv)
  const handleFile = useCallback(async (file: File | null) => {
    setParsingError(null);
    setFilePreviewRows([]);
    setDetectedSheetName(null);

    if (!file) return;

    // show immediately
    setSelectedFileName(file.name || "Selected file");
    setSelectedFileMeta({ size: file.size, type: file.type });

    setParsing(true);
    try {
      const mod = await import("xlsx");
      const XLSX = (mod && (mod as any).default) ? (mod as any).default : mod;
      if (!XLSX || typeof XLSX.read !== "function") throw new Error("xlsx library not available in browser");

      const name = (file.name || "").toLowerCase();
      let wb: any;
      if (name.endsWith(".csv")) {
        const text = await file.text();
        wb = XLSX.read(text, { type: "string", raw: false });
      } else {
        const arrayBuffer = await file.arrayBuffer();
        wb = XLSX.read(arrayBuffer, { type: "array", raw: false });
      }

      if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) throw new Error("Workbook empty or unreadable");

      const preferred =
        wb.SheetNames.find((s: string) => /searchexport/i.test(s)) ?? wb.SheetNames[0];

      setDetectedSheetName(preferred || null);

      const ws = wb.Sheets[preferred];
      if (!ws) throw new Error(`Sheet not found: ${preferred}`);

      const rawJson = XLSX.utils.sheet_to_json(ws, { defval: "", blankrows: false }) as any[];
      const mapped: PreviewRow[] = rawJson.slice(0, 200).map((r: any, i: number) => ({
        row_id: String(i + 1),
        supplier_name: String(r["Supplier Name"] ?? r["supplier"] ?? r.supplier_name ?? r.Vendor ?? "").trim(),
        sku: String(r["SKU"] ?? r["sku"] ?? r["Item SKU"] ?? r.mpn ?? "").trim(),
        ndc_item_code: String(r["NDC Item Code"] ?? r["NDC"] ?? r.ndc ?? "").trim(),
        product_name: String(r["Product Name"] ?? r["Item Name"] ?? r.name ?? r.title ?? "").trim(),
        brand_name: String(r["Brand Name"] ?? r["Brand"] ?? r.brand ?? "").trim(),
        raw: r,
      }));
      setFilePreviewRows(mapped);
    } catch (err: any) {
      console.error("Failed to parse uploaded file:", err);
      setParsingError(String(err?.message ?? err));
      alert(`Failed to parse file: ${String(err?.message ?? err)} — see console`);
    } finally {
      setParsing(false);
    }
  }, []);

  // fetch job status
  const fetchJobStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/v1/match/url-jobs/${encodeURIComponent(id)}`);
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) {
        setJobStatus(j.job ?? null);
        return j.job ?? null;
      }
      return null;
    } catch (err) {
      console.warn("fetchJobStatus error", err);
      return null;
    }
  }, []);

  // fetch rows
  const fetchResultsRows = useCallback(
    async (id: string, status?: string | undefined, limit = 50, offset = 0) => {
      setResultsLoading(true);
      try {
        const url = new URL(`/api/v1/match/url-jobs/${encodeURIComponent(id)}/rows`, location.origin);
        if (status) url.searchParams.set("status", status);
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("offset", String(offset));
        const res = await fetch(url.toString());
        const j = await res.json().catch(() => null);
        if (!res.ok || !j?.ok) {
          setResultsRows([]);
          return [];
        }
        setResultsRows(j.rows ?? []);
        return j.rows ?? [];
      } catch (err) {
        console.warn("fetchResultsRows error", err);
        setResultsRows([]);
        return [];
      } finally {
        setResultsLoading(false);
      }
    },
    []
  );

  // poll job status
  const pollJobStatus = useCallback(
    async (id: string) => {
      if (!id) return;
      setPolling(true);
      try {
        const intervalMs = 2500;
        while (true) {
          // eslint-disable-next-line no-await-in-loop
          const job = await fetchJobStatus(id);
          if (job && ["running", "partial", "succeeded"].includes(job.status)) {
            // eslint-disable-next-line no-await-in-loop
            await fetchResultsRows(id, resultsStatusFilter, resultsLimit, resultsOffset);
          }
          if (!job || ["succeeded", "failed", "partial", "canceled"].includes(job?.status)) break;
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, intervalMs));
        }
      } finally {
        setPolling(false);
      }
    },
    [fetchJobStatus, fetchResultsRows, resultsStatusFilter, resultsLimit, resultsOffset]
  );

  // create job
  const createJob = useCallback(
    async (rows?: PreviewRow[]) => {
      const payloadRows = (rows ?? filePreviewRows) || [];
      if (!payloadRows.length) {
        alert("No preview rows to create job from.");
        return null;
      }

      setCreatingJob(true);
      try {
        const body = {
          file_name: selectedFileName || `upload-${Date.now()}`,
          rows: payloadRows.map((r) => ({ ...r, raw: r.raw })),
        };
        const res = await fetch("/api/v1/match/url-jobs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = await res.json().catch(() => null);
        if (!res.ok || !j?.ok) {
          alert("Create job failed: " + (j?.error ?? res.statusText));
          return null;
        }
        setJobId(j.job_id);
        await fetchJobStatus(j.job_id);
        await fetchResultsRows(j.job_id, resultsStatusFilter, resultsLimit, resultsOffset);
        return j.job_id;
      } catch (err: any) {
        console.error("createJob error:", err);
        alert("Create job failed (see console)");
        return null;
      } finally {
        setCreatingJob(false);
      }
    },
    [filePreviewRows, fetchJobStatus, fetchResultsRows, resultsLimit, resultsOffset, resultsStatusFilter, selectedFileName]
  );

  // start job
  const startJob = useCallback(
    async (id?: string | null) => {
      const jid = id ?? jobId;
      if (!jid) return alert("No job selected to start.");
      setStartingJob(true);
      try {
        const res = await fetch(`/api/v1/match/url-jobs/${encodeURIComponent(jid)}/start`, { method: "POST" });
        const j = await res.json().catch(() => null);
        if (!res.ok || !j?.ok) {
          alert("Start job failed: " + (j?.error ?? res.statusText));
          return;
        }
        pollJobStatus(jid);
      } catch (err: any) {
        console.error("startJob error:", err);
      } finally {
        setStartingJob(false);
      }
    },
    [jobId, pollJobStatus]
  );

  const createAndStart = useCallback(async () => {
    const jid = await createJob();
    if (jid) await startJob(jid);
  }, [createJob, startJob]);

  const retryUnresolved = useCallback(async () => {
    if (!jobId) return alert("No job selected");
    try {
      const res = await fetch(`/api/v1/match/url-jobs/${encodeURIComponent(jobId)}/requeue`, { method: "POST" });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        alert("Retry failed: " + (j?.error ?? res.statusText));
        return;
      }
      await startJob(jobId);
      setTimeout(() => fetchResultsRows(jobId, resultsStatusFilter, resultsLimit, resultsOffset), 2500);
    } catch (err: any) {
      console.error("retryUnresolved error:", err);
      alert("Retry failed (see console)");
    }
  }, [jobId, startJob, fetchResultsRows, resultsLimit, resultsOffset, resultsStatusFilter]);

  useEffect(() => {
    if (!jobId) {
      setResultsRows([]);
      return;
    }
    fetchResultsRows(jobId, resultsStatusFilter, resultsLimit, resultsOffset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const approveCandidate = useCallback(
    async (rowIdentifier: string, candidateUrl: string) => {
      if (!jobId) return alert("No job context");
      if (!confirm("Approve this candidate URL and mark row resolved?")) return;
      try {
        const res = await fetch(
          `/api/v1/match/url-jobs/${encodeURIComponent(jobId)}/rows/${encodeURIComponent(rowIdentifier)}/approve`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ approved_url: candidateUrl }),
          }
        );
        const j = await res.json().catch(() => null);
        if (!res.ok || !j?.ok) {
          alert("Approve failed: " + (j?.error ?? res.statusText));
          return;
        }
        await fetchResultsRows(jobId, resultsStatusFilter, resultsLimit, resultsOffset);
        await fetchJobStatus(jobId);
      } catch (err) {
        console.error("approveCandidate error:", err);
        alert("Approve failed (see console)");
      }
    },
    [jobId, fetchResultsRows, fetchJobStatus, resultsStatusFilter, resultsLimit, resultsOffset]
  );

  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const toggleRowSelection = useCallback((id: string) => setSelectedRowIds((m) => ({ ...m, [id]: !m[id] })), []);
  const clearSelection = useCallback(() => setSelectedRowIds({}), []);
  const bulkApproveSelected = useCallback(async () => {
    if (!jobId) return alert("No job selected");
    const ids = Object.keys(selectedRowIds).filter((k) => selectedRowIds[k]);
    if (!ids.length) return alert("No rows selected");
    if (!confirm(`Approve ${ids.length} selected rows using their top candidate?`)) return;
    for (const id of ids) {
      const row = resultsRows.find((r) => r.id === id || r.row_id === id);
      const top = row?.candidates?.[0]?.url ?? null;
      if (top) await approveCandidate(row.id ?? row.row_id, top);
    }
    clearSelection();
    if (jobId) await fetchResultsRows(jobId, resultsStatusFilter, resultsLimit, resultsOffset);
  }, [selectedRowIds, resultsRows, jobId, approveCandidate, clearSelection, fetchResultsRows, resultsStatusFilter, resultsLimit, resultsOffset]);

  const exportResultsCsv = useCallback(() => {
    if (!resultsRows || resultsRows.length === 0) return alert("No results to export");
    const baseCols = ["row_id", "supplier_name", "sku", "ndc_item_code", "product_name", "brand_name"];
    const rawKeys = new Set<string>();
    for (const r of resultsRows) {
      const raw = r.raw ?? {};
      if (raw && typeof raw === "object") Object.keys(raw).forEach((k) => rawKeys.add(k));
    }
    const lowerBase = new Set(Array.from(baseCols).map((c) => c.toLowerCase()));
    const extraRawKeys = Array.from(rawKeys).filter((k) => !lowerBase.has(k.toLowerCase()));
    const addedCols = ["status", "resolved_url", "resolved_domain", "confidence", "candidates"];
    const headers = [...baseCols, ...extraRawKeys, ...addedCols];

    const lines: string[] = [];
    lines.push(headers.map(escapeCsv).join(","));

    for (const r of resultsRows) {
      const raw = r.raw ?? {};
      const rowValues: any[] = [];
      for (const h of baseCols) {
        const v = r[h] ?? raw[h] ?? raw[h.replace(/\s+/g, " ")] ?? "";
        rowValues.push(v);
      }
      for (const rk of extraRawKeys) rowValues.push(raw[rk] ?? "");

      let cand = "";
      if (Array.isArray(r.candidates) && r.candidates.length) {
        cand = r.candidates.map((c: any) => (typeof c === "string" ? c : c.url ?? JSON.stringify(c))).join(" | ");
      }
      rowValues.push(r.status ?? "", r.resolved_url ?? "", r.resolved_domain ?? "", r.confidence ?? "", cand);
      lines.push(rowValues.map(escapeCsv).join(","));
    }

    const csvBlob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(csvBlob);
    const a = document.createElement("a");
    a.href = url;
    const filename = `match-results-${jobId ?? Date.now()}.csv`;
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [resultsRows, jobId]);

  const uploadProps = useMemo(() => ({ onFile: handleFile }), [handleFile]);
  const resultsTableProps = useMemo(
    () => ({
      rows: resultsRows,
      loading: resultsLoading,
      selectedRowIds,
      toggleRowSelection,
      onRefresh: () => jobId && fetchResultsRows(jobId, resultsStatusFilter, resultsLimit, resultsOffset),
      approveCandidate,
    }),
    [resultsRows, resultsLoading, selectedRowIds, toggleRowSelection, jobId, fetchResultsRows, resultsStatusFilter, resultsLimit, resultsOffset, approveCandidate]
  );
  const bulkActionsProps = useMemo(
    () => ({
      selectedCount: Object.keys(selectedRowIds).filter((k) => selectedRowIds[k]).length,
      onBulkApprove: bulkApproveSelected,
      onClearSelection: clearSelection,
    }),
    [selectedRowIds, bulkApproveSelected, clearSelection]
  );

  const UploadComp: any = UploadPastePanel as any;
  const ResultsComp: any = ResultsTable as any;
  const JobProgressComp: any = JobProgress as any;

  const previewCount = filePreviewRows.length;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of resultsRows ?? []) counts[String(r.status ?? "unknown")] = (counts[String(r.status ?? "unknown")] ?? 0) + 1;
    return counts;
  }, [resultsRows]);

  const resolvedCount = (statusCounts["resolved"] ?? 0) + (statusCounts["succeeded"] ?? 0);
  const unresolvedCount = (statusCounts["unresolved"] ?? 0) + (statusCounts["failed"] ?? 0);

  if (!featureEnabled) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/45">
          <div className="text-sm font-semibold">AvidiaMatch disabled</div>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Matching is not enabled for this workspace yet. Toggle FEATURE_MATCH / NEXT_PUBLIC_FEATURE_MATCH.
          </div>
        </div>
      </main>
    );
  }

  const jobStatusText = jobStatus?.status ? String(jobStatus.status) : "—";

  return (
    <main className="relative min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-52 -left-44 h-[30rem] w-[30rem] rounded-full bg-fuchsia-300/16 blur-3xl dark:bg-fuchsia-500/12" />
        <div className="absolute -bottom-52 right-[-14rem] h-[34rem] w-[34rem] rounded-full bg-sky-300/18 blur-3xl dark:bg-sky-500/12" />
        <div className="absolute top-28 right-10 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.92)_58%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_58%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.07]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-7xl space-y-6 px-4 pt-4 pb-10 sm:px-6 lg:px-8 lg:pt-6">
        {/* header */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/60 bg-white/80 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-fuchsia-700 shadow-sm backdrop-blur dark:border-fuchsia-400/30 dark:bg-slate-950/55 dark:text-fuchsia-100 whitespace-nowrap">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-fuchsia-400/50 bg-slate-100 dark:border-fuchsia-400/25 dark:bg-slate-900">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-fuchsia-500 dark:bg-fuchsia-300" />
                </span>
                Data Intelligence • AvidiaMatch
              </span>

              <TinyChip tone="signal">SKU → URL resolution</TinyChip>
              <TinyChip tone={jobId ? "success" : "neutral"}>{jobId ? "Job loaded" : "No job"}</TinyChip>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold leading-tight text-slate-900 lg:text-3xl dark:text-slate-50">
                Match{" "}
                <span className="bg-gradient-to-r from-fuchsia-500 via-purple-500 to-sky-500 bg-clip-text text-transparent dark:from-fuchsia-300 dark:via-purple-300 dark:to-sky-300">
                  SKU to product URL
                </span>
              </h1>
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Upload distributor sheets, resolve URLs at scale, then approve edge cases. Export back to CSV for the pipeline.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatPill label="Selected file" value={selectedFileName ? selectedFileName : "—"} tone="signal" />
              <StatPill label="Preview rows" value={parsing ? "Parsing…" : previewCount} tone="signal" />
              <StatPill label="Resolved" value={jobId ? resolvedCount : "—"} tone="success" />
              <StatPill label="Unresolved" value={jobId ? unresolvedCount : "—"} tone={jobId && unresolvedCount > 0 ? "danger" : "neutral"} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <SoftButton href="#match-upload" variant="primary">
              Upload
            </SoftButton>
            <SoftButton href="#match-results" variant="secondary">
              Results
            </SoftButton>
            <SoftButton href="/dashboard/import" variant="secondary">
              Import
            </SoftButton>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-12">
          {/* left */}
          <div className="lg:col-span-8 space-y-4 min-w-0">
            <div
              id="match-upload"
              className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_14px_40px_-28px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/45"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Upload or paste rows</h2>
                    <TinyChip>Step 1</TinyChip>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Upload XLSX/CSV or paste rows. Preview is capped at 200 rows.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <SoftButton
                    variant="secondary"
                    onClick={() => {
                      setFilePreviewRows([]);
                      setParsingError(null);
                      clearSelectedFile();
                    }}
                    disabled={parsing}
                    title="Clear preview + selected file"
                  >
                    Clear
                  </SoftButton>

                  <label
                    className={cx(
                      "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
                      "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm",
                      "hover:bg-white hover:text-slate-900 cursor-pointer whitespace-nowrap",
                      "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                    )}
                    title="Upload XLSX/CSV"
                  >
                    <input
                      ref={fileInputRef}
                      id="match-upload-file"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        void handleFile(f);
                      }}
                      className="hidden"
                    />
                    Choose file
                  </label>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {/* Selected file row + detected sheet */}
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/35">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Selected file
                      </div>

                      {selectedFileName ? (
                        <div className="mt-1 min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {selectedFileName}
                          </div>

                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="truncate">
                              {selectedFileMeta?.size ? formatBytes(selectedFileMeta.size) : "—"}
                              {selectedFileMeta?.type ? ` · ${selectedFileMeta.type}` : ""}
                            </span>

                            {detectedSheetName ? (
                              <>
                                <span className="opacity-60">•</span>
                                <span className="truncate">
                                  Sheet: <span className="font-medium">{detectedSheetName}</span>
                                </span>
                              </>
                            ) : null}

                            {parsing ? (
                              <>
                                <span className="opacity-60">•</span>
                                <span>parsing…</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          No file selected yet.
                        </div>
                      )}
                    </div>

                    {selectedFileName ? (
                      <button
                        onClick={clearSelectedFile}
                        className={cx(
                          "shrink-0 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap",
                          "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm",
                          "hover:bg-white hover:text-slate-900",
                          "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50"
                        )}
                        title="Remove selected file"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>

                <UploadComp onFile={handleFile} />

                {parsingError ? (
                  <div className="rounded-xl border border-red-200/70 bg-red-50/80 p-3 text-xs text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-100">
                    <div className="font-semibold">Parse error</div>
                    <div className="mt-1 break-words">{parsingError}</div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Preview rows: <span className="font-semibold">{previewCount}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <SoftButton
                      variant="primary"
                      onClick={() => void createAndStart()}
                      disabled={parsing || creatingJob || startingJob || !filePreviewRows.length}
                      title="Create job and start resolving"
                    >
                      {creatingJob || startingJob ? "Working…" : "Create & start"}
                    </SoftButton>

                    <SoftButton
                      variant="secondary"
                      onClick={() => void createJob()}
                      disabled={parsing || creatingJob || !filePreviewRows.length}
                      title="Create job from preview rows"
                    >
                      {creatingJob ? "Creating…" : "Create job"}
                    </SoftButton>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters + bulk */}
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_14px_40px_-28px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/45">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Filter and approve</h2>
                    <TinyChip>Step 2</TinyChip>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Narrow by status, select rows, then bulk approve top candidates.
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-2 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/35">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        Status
                      </span>

                      <MatchFilters
                        onChangeStatus={(s: string) => {
                          const val = s || undefined;
                          setResultsStatusFilter(val);
                          if (jobId) fetchResultsRows(jobId, val, resultsLimit, 0);
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-2 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/35">
                    <BulkActions {...bulkActionsProps} />
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div
              id="match-results"
              className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_14px_40px_-28px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/45 min-w-0"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Review results</h2>
                    <TinyChip>Step 3</TinyChip>
                    {resultsLoading ? <TinyChip tone="signal">Loading…</TinyChip> : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <SoftButton
                    variant="secondary"
                    onClick={() => jobId && fetchResultsRows(jobId, resultsStatusFilter, resultsLimit, resultsOffset)}
                    disabled={!jobId}
                  >
                    Refresh
                  </SoftButton>
                  <SoftButton variant="secondary" onClick={() => void retryUnresolved()} disabled={!jobId}>
                    Retry unresolved
                  </SoftButton>
                  <SoftButton variant="secondary" onClick={() => exportResultsCsv()} disabled={!resultsRows || resultsRows.length === 0}>
                    Download CSV
                  </SoftButton>
                </div>
              </div>

              <div className="mt-4 space-y-4 min-w-0">
                <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-2 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/35">
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[720px]">
                      <ResultsComp {...resultsTableProps} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* right */}
          <aside className="lg:col-span-4 space-y-4 min-w-0">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_14px_40px_-28px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/45 overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Job console</h3>
                    <TinyChip tone={polling ? "signal" : "neutral"}>{polling ? "Polling" : "Idle"}</TinyChip>
                  </div>
                </div>

                <TinyChip tone={jobId ? "success" : "neutral"}>{jobStatus?.status ? String(jobStatus.status) : "—"}</TinyChip>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/35">
                <JobProgressComp
                  jobId={jobId}
                  jobStatus={jobStatus}
                  startJob={() => startJob(jobId)}
                  refresh={() => jobId && fetchJobStatus(jobId)}
                  polling={polling}
                />
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
