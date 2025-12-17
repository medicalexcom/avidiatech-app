"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import UploadPastePanel from "./_components/UploadPastePanel";
import JobProgress from "./_components/JobProgress";
import MatchFilters from "./_components/MatchFilters";
import ResultsTable from "./_components/ResultsTable";
import BulkActions from "./_components/BulkActions";

/**
 * MatchPage — debug + robust buttons
 *
 * Fixed: moved fetchResultsRows / fetchJobStatus above createJob to satisfy TS.
 * Includes debug panel + fallback table so rows are visible immediately.
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
  const featureEnabled = true;

  // upload / preview
  const [filePreviewRows, setFilePreviewRows] = useState<PreviewRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);

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

  // debug
  const [lastCreateResponse, setLastCreateResponse] = useState<any | null>(null);
  const [lastRowsResponse, setLastRowsResponse] = useState<any | null>(null);
  const [lastFetchError, setLastFetchError] = useState<string | null>(null);

  // parse file (xlsx/csv)
  const handleFile = useCallback(async (file: File | null) => {
    setParsingError(null);
    setFilePreviewRows([]);
    if (!file) return;
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

      const preferred = wb.SheetNames.find((s: string) => /searchexport/i.test(s)) ?? wb.SheetNames[0];
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
        raw: r
      }));
      console.log("Parsed preview rows:", mapped.length);
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
      console.warn("fetchJobStatus returned non-ok", j ?? res.status);
      return null;
    } catch (err) {
      console.warn("fetchJobStatus error", err);
      return null;
    }
  }, []);

  // fetch rows
  const fetchResultsRows = useCallback(async (id: string, status?: string | undefined, limit = 50, offset = 0) => {
    setResultsLoading(true);
    setLastFetchError(null);
    try {
      const url = new URL(`/api/v1/match/url-jobs/${encodeURIComponent(id)}/rows`, location.origin);
      if (status) url.searchParams.set("status", status);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));
      console.log("Fetching rows from", url.toString());
      const res = await fetch(url.toString());
      const j = await res.json().catch(() => ({ status: res.status, statusText: res.statusText }));
      setLastRowsResponse(j);
      if (!res.ok || !j?.ok) {
        console.error("fetchResultsRows failed", j);
        setResultsRows([]);
        setLastFetchError(String(j?.error ?? res.statusText));
        return;
      }
      setResultsRows(j.rows ?? []);
      console.log("Fetched rows:", (j.rows ?? []).length);
    } catch (err: any) {
      console.warn("fetchResultsRows error", err);
      setResultsRows([]);
      setLastFetchError(String(err?.message ?? err));
    } finally {
      setResultsLoading(false);
    }
  }, []);

  // poll job status
  const pollJobStatus = useCallback(async (id: string) => {
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
  }, [fetchJobStatus, fetchResultsRows, resultsStatusFilter, resultsLimit, resultsOffset]);

  // create job
  const createJob = useCallback(async (rows?: PreviewRow[]) => {
    const payloadRows = (rows ?? filePreviewRows) || [];
    if (!payloadRows.length) {
      alert("No preview rows to create job from.");
      return null;
    }

    console.log("Create job clicked — rows:", payloadRows.length);
    setCreatingJob(true);
    setLastCreateResponse(null);
    try {
      const body = { file_name: `upload-${Date.now()}`, rows: payloadRows.map((r) => ({ ...r, raw: r.raw })) };
      const res = await fetch("/api/v1/match/url-jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({ status: res.status, statusText: res.statusText }));
      setLastCreateResponse(j);
      console.log("Create job response:", j);
      if (!res.ok || !j?.ok) {
        alert("Create job failed: " + (j?.error ?? res.statusText));
        return null;
      }
      setJobId(j.job_id);
      // immediately fetch job header and rows for feedback
      await fetchJobStatus(j.job_id);
      await fetchResultsRows(j.job_id, resultsStatusFilter, resultsLimit, resultsOffset);
      return j.job_id;
    } catch (err: any) {
      console.error("createJob error:", err);
      setLastCreateResponse({ error: String(err) });
      setLastFetchError(String(err?.message ?? err));
      alert("Create job failed (see console)");
      return null;
    } finally {
      setCreatingJob(false);
    }
  }, [filePreviewRows, fetchJobStatus, fetchResultsRows, resultsLimit, resultsOffset, resultsStatusFilter]);

  // start job
  const startJob = useCallback(async (id?: string | null) => {
    const jid = id ?? jobId;
    if (!jid) return alert("No job selected to start.");
    console.log("Start resolve clicked for job:", jid);
    setStartingJob(true);
    setLastCreateResponse(null);
    try {
      const res = await fetch(`/api/v1/match/url-jobs/${encodeURIComponent(jid)}/start`, { method: "POST" });
      const j = await res.json().catch(() => ({ status: res.status, statusText: res.statusText }));
      setLastCreateResponse(j);
      console.log("Start response:", j);
      if (!res.ok || !j?.ok) {
        alert("Start job failed: " + (j?.error ?? res.statusText));
        return;
      }
      pollJobStatus(jid);
    } catch (err: any) {
      console.error("startJob error:", err);
      setLastFetchError(String(err?.message ?? err));
    } finally {
      setStartingJob(false);
    }
  }, [jobId, pollJobStatus]);

  // combined action: create then start
  const createAndStart = useCallback(async () => {
    const jid = await createJob();
    if (jid) await startJob(jid);
  }, [createJob, startJob]);

  // when jobId changes fetch rows once
  useEffect(() => {
    if (!jobId) {
      setResultsRows([]);
      return;
    }
    fetchResultsRows(jobId, resultsStatusFilter, resultsLimit, resultsOffset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // Approve candidate (calls server approve endpoint)
  const approveCandidate = useCallback(async (rowIdentifier: string, candidateUrl: string) => {
    if (!jobId) return alert("No job context");
    if (!confirm("Approve this candidate URL and mark row resolved?")) return;
    try {
      const res = await fetch(`/api/v1/match/url-jobs/${encodeURIComponent(jobId)}/rows/${encodeURIComponent(rowIdentifier)}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved_url: candidateUrl })
      });
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
  }, [jobId, fetchResultsRows, fetchJobStatus, resultsStatusFilter, resultsLimit, resultsOffset]);

  // bulk approve
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
  }, [selectedRowIds, resultsRows, jobId, approveCandidate, resultsLimit, resultsOffset, resultsStatusFilter]);

  // child props
  const uploadProps = useMemo(() => ({ onFile: handleFile }), [handleFile]);
  const resultsTableProps = useMemo(() => ({ rows: resultsRows, loading: resultsLoading, selectedRowIds, toggleRowSelection, onRefresh: () => jobId && fetchResultsRows(jobId, resultsStatusFilter, resultsLimit, resultsOffset), approveCandidate }), [resultsRows, resultsLoading, selectedRowIds, toggleRowSelection, jobId, fetchResultsRows, resultsStatusFilter, resultsLimit, resultsOffset, approveCandidate]);
  const bulkActionsProps = useMemo(() => ({ selectedCount: Object.keys(selectedRowIds).filter((k) => selectedRowIds[k]).length, onBulkApprove: bulkApproveSelected, onClearSelection: clearSelection }), [selectedRowIds, bulkApproveSelected, clearSelection]);

  const UploadComp: any = UploadPastePanel as any;
  const FiltersComp: any = MatchFilters as any;
  const ResultsComp: any = ResultsTable as any;
  const BulkComp: any = BulkActions as any;
  const JobProgressComp: any = JobProgress as any;

  // UI
  if (!featureEnabled) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg rounded-xl border p-6">AvidiaMatch disabled</div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-slate-500">Data Intelligence · AvidiaMatch</div>
            <h1 className="mt-3 text-2xl font-bold">Match — SKU → Product URL</h1>
            <p className="text-sm text-slate-600">Upload competitor/product sheets, create jobs and verify candidate URLs.</p>
          </div>

          <div className="w-72">
            <div className="rounded-xl border p-3 bg-white">
              <div className="text-xs text-slate-500">Job</div>
              <div className="mt-2 font-mono text-sm break-all">{jobId ? `job:${jobId}` : "No job"}</div>
              <div className="mt-2 text-xs text-slate-500">{jobStatus ? jobStatus.status : "status: —"}</div>
              <div className="mt-3 space-y-2">
                <button onClick={() => { console.log("Upload & Create click"); createAndStart(); }} disabled={parsing || creatingJob || !filePreviewRows.length} className="w-full rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-60">
                  {creatingJob || startingJob ? "Working…" : "Upload & Create"}
                </button>

                <button onClick={() => { console.log("Create from preview click"); void createJob(); }} disabled={parsing || creatingJob || !filePreviewRows.length} className="w-full rounded border px-3 py-2 text-sm disabled:opacity-60">
                  {creatingJob ? "Creating…" : "Create job from preview"}
                </button>

                <button onClick={() => { console.log("Start resolve click"); void startJob(jobId); }} disabled={!jobId || startingJob || polling} className="w-full rounded border px-3 py-2 text-sm disabled:opacity-60">
                  {startingJob || polling ? "Starting…" : "Start resolve"}
                </button>

                <button onClick={() => { console.log("Refresh rows click"); jobId && fetchResultsRows(jobId, resultsStatusFilter, resultsLimit, resultsOffset); }} disabled={!jobId} className="w-full rounded border px-3 py-2 text-sm mt-1">
                  Refresh rows
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main grid */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            {/* Upload panel */}
            <div className="rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">1 · Upload or paste data</h2>
                  <p className="text-xs text-slate-500">Upload XLSX/CSV or paste rows.</p>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                <UploadComp {...uploadProps} />
                <div className="flex items-center gap-3">
                  <input id="match-upload-file" type="file" accept=".xlsx,.xls,.csv" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} className="rounded border p-2" />
                  <label htmlFor="match-upload-file" className="text-xs text-slate-500">Upload XLSX/CSV</label>
                  {parsing && <div className="text-xs text-slate-500">Parsing…</div>}
                </div>

                {parsingError ? <div className="text-xs text-red-600">Parse error: {parsingError}</div> : null}
                <div className="text-xs text-slate-500">Preview shows up to 200 rows.</div>
                <div className="mt-2 text-xs text-slate-600">Preview rows: {filePreviewRows.length}</div>
              </div>
            </div>

            {/* Filters + bulk */}
            <div className="rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">2 · Refine matches</h2>
                  <p className="text-xs text-slate-500">Filter by status and apply bulk actions.</p>
                </div>
              </div>

              <div className="mt-3 flex gap-4">
                <FiltersComp onChangeStatus={(s: string) => { setResultsStatusFilter(s || undefined); if (jobId) fetchResultsRows(jobId, s || undefined, resultsLimit, 0); }} />
                <BulkComp {...bulkActionsProps} />
              </div>
            </div>

            {/* Results */}
            <div className="rounded-2xl border bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">3 · Review results</h2>
                <div className="text-xs text-slate-500">Live match grid</div>
              </div>

              <div className="mt-2">
                <ResultsComp {...resultsTableProps} />

                {/* Fallback simple table */}
                {resultsRows && resultsRows.length > 0 ? (
                  <div className="mt-4 rounded-md border bg-white p-3">
                    <h4 className="text-sm font-semibold mb-2">Fallback: Raw rows (simple view)</h4>
                    <div className="overflow-auto">
                      <table className="w-full table-auto text-sm">
                        <thead>
                          <tr className="text-left">
                            <th className="px-2 py-1">Row ID</th>
                            <th className="px-2 py-1">SKU</th>
                            <th className="px-2 py-1">Product Name</th>
                            <th className="px-2 py-1">Supplier</th>
                            <th className="px-2 py-1">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultsRows.map((r: any) => (
                            <tr key={r.id} className="border-t">
                              <td className="px-2 py-1">{r.row_id ?? r.id}</td>
                              <td className="px-2 py-1">{r.sku}</td>
                              <td className="px-2 py-1">{r.product_name}</td>
                              <td className="px-2 py-1">{r.supplier_name}</td>
                              <td className="px-2 py-1">{r.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mt-3">No rows to display yet.</div>
                )}
              </div>
            </div>

            {/* Debug */}
            <div className="rounded-2xl border bg-white p-3">
              <h3 className="text-sm font-semibold">Debug</h3>
              <div className="mt-2 text-xs">
                <div className="mb-2">
                  <strong>Last create response:</strong>
                  <pre className="max-h-48 overflow-auto bg-slate-50 p-2 text-xs">{lastCreateResponse ? JSON.stringify(lastCreateResponse, null, 2) : "none"}</pre>
                </div>
                <div className="mb-2">
                  <strong>Last rows response:</strong>
                  <pre className="max-h-48 overflow-auto bg-slate-50 p-2 text-xs">{lastRowsResponse ? JSON.stringify(lastRowsResponse, null, 2) : "none"}</pre>
                </div>
                <div className="mb-2">
                  <strong>Last fetch error:</strong>
                  <div className="text-red-600 text-xs">{lastFetchError ?? "none"}</div>
                </div>
                <div>
                  <strong>Preview sample:</strong>
                  <pre className="max-h-48 overflow-auto bg-slate-50 p-2 text-xs">{filePreviewRows.length ? JSON.stringify(filePreviewRows.slice(0,5), null, 2) : "none"}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <aside className="space-y-4">
            <div className="rounded-2xl border bg-white p-4">
              <h3 className="text-sm font-semibold">Match queue</h3>
              <div className="mt-3">
                <JobProgressComp jobId={jobId} jobStatus={jobStatus} startJob={() => startJob(jobId)} refresh={() => jobId && fetchJobStatus(jobId)} polling={polling} />
              </div>
            </div>

            <div className="rounded-2xl border-dashed bg-slate-50 p-4">
              <h3 className="text-xs font-semibold text-slate-500">Tips for better matching</h3>
              <ul className="mt-2 text-xs text-slate-600">
                <li>Include manufacturer part numbers (MPN) where possible.</li>
                <li>One row per variant improves accuracy.</li>
                <li>Use consistent brand names with AvidiaExtract.</li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
