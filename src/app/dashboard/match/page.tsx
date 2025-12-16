"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import UploadPastePanel from "./_components/UploadPastePanel";
import JobProgress from "./_components/JobProgress";
import MatchFilters from "./_components/MatchFilters";
import ResultsTable from "./_components/ResultsTable";
import BulkActions from "./_components/BulkActions";

/**
 * MatchPage (upgraded)
 *
 * - Parses uploaded sheets (xlsx/csv) client-side (dynamic import of xlsx).
 * - Shows preview, creates a match job, starts the job and polls status.
 * - Fetches and pages job rows; wires results into ResultsTable and BulkActions.
 *
 * API endpoints used:
 * - POST /api/v1/match/url-jobs            -> create job
 * - POST /api/v1/match/url-jobs/[jobId]/start -> start processing
 * - GET  /api/v1/match/url-jobs/[jobId]     -> job status
 * - GET  /api/v1/match/url-jobs/[jobId]/rows -> fetch rows (status, limit, offset)
 *
 * Note: ResultsTable and other child components are used as-is and receive props from this container.
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

export default function MatchPage() {
  const featureEnabled = true; // temporarily forced

  // UI / job state
  const [filePreviewRows, setFilePreviewRows] = useState<PreviewRow[]>([]);
  const [selectedPreviewRowIds, setSelectedPreviewRowIds] = useState<Record<string, boolean>>({});
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any | null>(null);
  const [polling, setPolling] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // results state (fetched from job rows API)
  const [resultsRows, setResultsRows] = useState<any[]>([]);
  const [resultsStatusFilter, setResultsStatusFilter] = useState<string | undefined>(undefined);
  const [resultsLimit, setResultsLimit] = useState<number>(50);
  const [resultsOffset, setResultsOffset] = useState<number>(0);
  const [resultsTotal, setResultsTotal] = useState<number | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // parse file (xlsx/csv); produce preview rows (first 200)
  const handleFile = useCallback(async (file: File | null) => {
    setFilePreviewRows([]);
    setSelectedPreviewRowIds({});
    if (!file) return;

    try {
      const XLSX = (await import("xlsx")).default;
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: "array" });
      // choose first sheet
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rawJson = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];
      const mapped: PreviewRow[] = rawJson.slice(0, 200).map((r, i) => ({
        row_id: String(i + 1),
        supplier_name: (r["Supplier Name"] ?? r["supplier"] ?? r["Supplier"] ?? r.supplier_name ?? r.supplier_name ?? "").toString(),
        sku: (r["SKU"] ?? r["sku"] ?? r["Item SKU"] ?? r.sku ?? "").toString(),
        ndc_item_code: (r["NDC Item Code"] ?? r["NDC"] ?? r["ndc"] ?? r.ndc ?? "").toString(),
        product_name: (r["Product Name"] ?? r["Item Name"] ?? r["Name"] ?? r.name ?? "").toString(),
        brand_name: (r["Brand Name"] ?? r["Brand"] ?? r.brand ?? "").toString(),
        raw: r
      }));
      setFilePreviewRows(mapped);
    } catch (err) {
      console.error("Failed parsing uploaded file:", err);
      // Fallback: try CSV text parsing if needed or show error message.
      alert("Failed to parse file in the browser. Please ensure it's an XLSX/CSV file and try again.");
    }
  }, []);

  // Create job from preview rows
  const createJob = useCallback(async () => {
    if (!filePreviewRows.length) {
      alert("No preview rows to create a job from.");
      return;
    }
    try {
      const body = {
        tenant_id: tenantId,
        file_name: `upload-${Date.now()}`,
        rows: filePreviewRows.map((r) => ({
          row_id: r.row_id,
          supplier_name: r.supplier_name,
          sku: r.sku,
          ndc_item_code: r.ndc_item_code,
          product_name: r.product_name,
          brand_name: r.brand_name,
          raw: r.raw
        }))
      };
      const res = await fetch("/api/v1/match/url-jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        console.error("create job failed", j);
        alert("Create job failed: " + (j?.error ?? res.statusText));
        return;
      }
      setJobId(j.job_id);
      // reset pagination for results
      setResultsOffset(0);
      setResultsRows([]);
      // fetch status immediately
      fetchJobStatus(j.job_id);
    } catch (err) {
      console.error("createJob error:", err);
      alert("Create job failed (see console).");
    }
  }, [filePreviewRows, tenantId]);

  // Start processing job (server-side worker)
  const startJob = useCallback(async (id?: string | null) => {
    const jid = id ?? jobId;
    if (!jid) return alert("No job selected to start.");
    try {
      const res = await fetch(`/api/v1/match/url-jobs/${encodeURIComponent(jid)}/start`, { method: "POST" });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        console.error("start job failed", j);
        alert("Start job failed: " + (j?.error ?? res.statusText));
        return;
      }
      // begin polling
      pollJobStatus(jid);
    } catch (err) {
      console.error("startJob error:", err);
    }
  }, [jobId]);

  // fetch job header/status
  const fetchJobStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/v1/match/url-jobs/${encodeURIComponent(id)}`);
      const j = await res.json();
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

  // poll job status until final state
  const pollJobStatus = useCallback(async (id: string) => {
    if (!id) return;
    setPolling(true);
    let keep = true;
    const intervalMs = 2500;
    while (keep) {
      // eslint-disable-next-line no-await-in-loop
      const job = await fetchJobStatus(id);
      // update results if job progressed
      // If job running or completed, fetch rows for display
      if (job) {
        if (["running","partial","succeeded","failed","canceled"].includes(job.status)) {
          // eslint-disable-next-line no-await-in-loop
          await fetchResultsRows(id, resultsStatusFilter, resultsLimit, resultsOffset);
        }
      }
      if (!job || ["succeeded","failed","partial","canceled"].includes(job?.status)) {
        keep = false;
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    setPolling(false);
  }, [fetchJobStatus, resultsStatusFilter, resultsLimit, resultsOffset]);

  // fetch rows from job (paged), optionally filtering by status
  const fetchResultsRows = useCallback(async (id: string, status?: string | undefined, limit = 50, offset = 0) => {
    setLoadingResults(true);
    try {
      const url = new URL(`/api/v1/match/url-jobs/${encodeURIComponent(id)}/rows`, location.origin);
      if (status) url.searchParams.set("status", status);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));
      const res = await fetch(url.toString());
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        console.error("fetchResultsRows failed", j);
        setResultsRows([]);
        return;
      }
      setResultsRows(j.rows ?? []);
      // We don't get total from this endpoint in current spec; estimate via job header
      // Fetch job header to update counts
      if (jobId) {
        const header = await fetchJobStatus(jobId);
        if (header) {
          // set resultsTotal from job counts (rough)
          const totalEstimate = header.input_count ?? null;
          setResultsTotal(totalEstimate);
        }
      }
    } catch (err) {
      console.warn("fetchResultsRows error", err);
      setResultsRows([]);
    } finally {
      setLoadingResults(false);
    }
  }, [jobId, fetchJobStatus]);

  // effect: when jobId changes, fetch rows
  useEffect(() => {
    if (!jobId) {
      setResultsRows([]);
      return;
    }
    // initial fetch
    fetchResultsRows(jobId, resultsStatusFilter, resultsLimit, resultsOffset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // selected rows for BulkActions
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const toggleRowSelection = useCallback((id: string) => {
    setSelectedRowIds((m) => ({ ...m, [id]: !m[id] }));
  }, []);

  const clearSelection = useCallback(() => setSelectedRowIds({}), []);

  // Approve a candidate (UI-side). This will call a server API to mark that row as approved
  // and to upsert into product_source_index. The endpoint is not included in the initial
  // server list above; implement /api/v1/match/rows/[rowId]/approve server-side when ready.
  const approveCandidate = useCallback(async (rowId: string, candidateUrl: string) => {
    if (!jobId) return alert("No job context");
    if (!confirm("Approve this candidate URL and mark row resolved?")) return;
    try {
      const res = await fetch(`/api/v1/match/url-jobs/${encodeURIComponent(jobId)}/rows/${encodeURIComponent(rowId)}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved_url: candidateUrl })
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        alert("Approve failed: " + (j?.error ?? res.statusText));
        return;
      }
      // refresh rows / job header
      await fetchResultsRows(jobId, resultsStatusFilter, resultsLimit, resultsOffset);
      await fetchJobStatus(jobId);
    } catch (err) {
      console.error("approveCandidate error:", err);
      alert("Approve failed (see console)");
    }
  }, [jobId, fetchResultsRows, fetchJobStatus, resultsStatusFilter, resultsLimit, resultsOffset]);

  // Bulk action: approve selected rows's top candidate (if any)
  const bulkApproveSelected = useCallback(async () => {
    if (!jobId) return alert("No job selected");
    const ids = Object.keys(selectedRowIds).filter((id) => selectedRowIds[id]);
    if (!ids.length) return alert("No rows selected");
    if (!confirm(`Approve ${ids.length} selected rows using their top candidate?`)) return;
    for (const id of ids) {
      // find row
      const row = resultsRows.find((r) => r.id === id || r.row_id === id);
      const candidates = row?.candidates ?? [];
      const top = candidates[0]?.url ?? null;
      if (top) {
        // eslint-disable-next-line no-await-in-loop
        await approveCandidate(row.id ?? row.row_id, top);
      }
    }
    clearSelection();
    await fetchResultsRows(jobId, resultsStatusFilter, resultsLimit, resultsOffset);
  }, [selectedRowIds, resultsRows, jobId, approveCandidate, clearSelection, fetchResultsRows, resultsStatusFilter, resultsLimit, resultsOffset]);

  // expose child-component props (some components accept props; cast to any to avoid TS mismatch)
  const uploadProps = useMemo(() => ({
    onFile: handleFile,
    onPasteRows: (rows: any[]) => {
      // Accept rows pasted as JSON/array-of-objects; convert to preview rows
      const mapped = (rows || []).slice(0, 200).map((r:any, i:number) => ({
        row_id: String(i+1),
        supplier_name: r["Supplier Name"] ?? r.supplier_name ?? r.supplier ?? "",
        sku: r["SKU"] ?? r.sku ?? "",
        ndc_item_code: r["NDC Item Code"] ?? r.ndc ?? r.ndc_item_code ?? "",
        product_name: r["Product Name"] ?? r.name ?? "",
        brand_name: r["Brand Name"] ?? r.brand ?? "",
        raw: r
      }));
      setFilePreviewRows(mapped);
    }
  }), [handleFile]);

  // results table props
  const resultsTableProps = useMemo(() => ({
    rows: resultsRows,
    loading: loadingResults,
    selectedRowIds,
    toggleRowSelection,
    onRefresh: () => jobId && fetchResultsRows(jobId, resultsStatusFilter, resultsLimit, resultsOffset),
    approveCandidate
  }), [resultsRows, loadingResults, selectedRowIds, toggleRowSelection, jobId, fetchResultsRows, resultsStatusFilter, resultsLimit, resultsOffset, approveCandidate]);

  // bulk actions props
  const bulkActionsProps = useMemo(() => ({
    selectedCount: Object.keys(selectedRowIds).filter((k) => selectedRowIds[k]).length,
    onBulkApprove: bulkApproveSelected,
    onClearSelection: clearSelection
  }), [selectedRowIds, bulkApproveSelected, clearSelection]);

  if (!featureEnabled) {
    // (previous disabled UI) - keep original block for feature gating
    return (
      <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        {/* ... (disabled state UI) ... */}
        <div className="relative flex min-h-[60vh] items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white/95 px-6 py-7 shadow-[0_22px_70px_rgba(148,163,184,0.4)] dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_22px_80px_rgba(15,23,42,0.95)]">
            <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-50">AvidiaMatch is disabled</h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Enable FEATURE_MATCH to use this module.</p>
          </div>
        </div>
      </main>
    );
  }

  // Main UI (feature enabled)
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* Header (kept from your original page) */}
        <section className="mb-4">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Data Intelligence · AvidiaMatch
              </div>
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-50">
                Match competitor and marketplace listings to your source catalog.
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Upload marketplace exports, create a match job and review results. Use bulk actions to approve or reject matches.
              </p>
            </div>

            <div className="w-full max-w-xs lg:max-w-sm">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-md sm:px-5 sm:py-4 dark:border-slate-800 dark:bg-slate-950/90">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">Module status</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Live &amp; active</span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  This panel shows quick operational tips. Full metrics available in Monitor Metrics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main content grid */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
          <div className="space-y-4">
            {/* Upload / paste panel */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">1 · Upload or paste data</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Paste rows or upload XLSX/CSV. We will preview and create a job for resolution.
                  </p>
                </div>
              </div>

              {/* Provide a fallback file input and wire UploadPastePanel */}
              <div className="mt-3">
                {/* If UploadPastePanel supports props, it will receive onFile / onPasteRows */}
                {/* Cast to any to avoid prop type mismatches */}
                {(UploadPastePanel as any) ? (
                  <div>
                    <(UploadPastePanel as any) {...uploadProps} />
                    <div className="mt-3 text-xs text-slate-500">Preview shows up to 200 rows.</div>
                  </div>
                ) : (
                  <div>
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={createJob} className="rounded bg-emerald-600 px-3 py-2 text-sm text-white shadow">Create job from preview</button>
                <button onClick={() => startJob(jobId)} disabled={!jobId} className="rounded border px-3 py-2 text-sm">Start resolve</button>
                <button onClick={() => { setFilePreviewRows([]); setJobId(null); setJobStatus(null); setResultsRows([]); }} className="rounded border px-3 py-2 text-sm">Reset</button>
              </div>

              <div className="mt-3 text-xs text-slate-500">
                {filePreviewRows.length ? `Preview rows: ${filePreviewRows.length}` : "No preview loaded."}
              </div>
            </div>

            {/* Filters + bulk actions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">2 · Refine matches</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Filter and bulk-action on rows returned by the job.</p>
                </div>
              </div>

              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex-1">
                  {(MatchFilters as any) ? <(MatchFilters as any) onChangeStatus={(s:string)=> { setResultsStatusFilter(s || undefined); if (jobId) fetchResultsRows(jobId, s || undefined, resultsLimit, 0); }} /> : null}
                </div>
                <div className="w-full md:w-[260px]">
                  {(BulkActions as any) ? <(BulkActions as any) {...bulkActionsProps} /> : null}
                </div>
              </div>
            </div>

            {/* Results table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900/85">
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">3 · Review results</h2>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Live match grid
                </span>
              </div>

              <div className="mb-2 flex flex-wrap gap-2 px-1">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">High confidence</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Needs review</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">Exploratory</span>
              </div>

              <p className="mb-2 px-1 text-[11px] text-slate-500 dark:text-slate-400">
                Inspect matches, approve candidates to add to the index, or reject rows. Use bulk actions for
                high-throughput workflows.
              </p>

              <div className="mt-1">
                {(ResultsTable as any) ? <(ResultsTable as any) {...resultsTableProps} /> : (
                  <div className="text-sm text-slate-500">Results table not available.</div>
                )}
              </div>
            </div>
          </div>

          {/* Right column: job progress / tips */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Match queue</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Track running jobs and drill into diagnostics.</p>
                </div>
              </div>

              {/* JobProgress component receives jobId + status + control callbacks */}
              <div>
                {(JobProgress as any) ? (
                  <(JobProgress as any)
                    jobId={jobId}
                    jobStatus={jobStatus}
                    startJob={() => startJob(jobId)}
                    refresh={() => jobId && fetchJobStatus(jobId)}
                    polling={polling}
                  />
                ) : (
                  <div className="text-xs text-slate-500">Job progress panel not available.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Tips for better matching</h3>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li>• Include manufacturer part numbers (MPN) for better confidence.</li>
                <li>• One row per product variant gives clearer matches.</li>
                <li>• Keep brand names consistent with your master catalog.</li>
                <li>• Re-run jobs after updating AvidiaExtract data.</li>
                <li>• Tune confidence thresholds for production vs discovery.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
