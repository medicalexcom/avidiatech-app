"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import UploadPastePanel from "./_components/UploadPastePanel";
import JobProgress from "./_components/JobProgress";
import MatchFilters from "./_components/MatchFilters";
import ResultsTable from "./_components/ResultsTable";
import BulkActions from "./_components/BulkActions";

/**
 * MatchPage — requires tenant UUID input before creating jobs
 *
 * - Adds tenant UUID input (validated) and persists to localStorage.
 * - Ensures create/start requests include tenant_id as a UUID.
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

function isUuid(s?: string | null) {
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export default function MatchPage() {
  const featureEnabled = true;

  // tenant
  const [tenantId, setTenantId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("av_match_tenant");
    } catch {
      return null;
    }
  });
  const [tenantError, setTenantError] = useState<string | null>(null);

  // preview / upload state
  const [filePreviewRows, setFilePreviewRows] = useState<PreviewRow[]>([]);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  // job state
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any | null>(null);
  const [creatingJob, setCreatingJob] = useState(false);
  const [startingJob, setStartingJob] = useState(false);
  const [polling, setPolling] = useState(false);

  // results state / pagination / filters
  const [resultsRows, setResultsRows] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsStatusFilter, setResultsStatusFilter] = useState<string | undefined>(undefined);
  const [resultsLimit, setResultsLimit] = useState<number>(50);
  const [resultsOffset, setResultsOffset] = useState<number>(0);

  useEffect(() => {
    // persist tenantId to localStorage
    try {
      if (tenantId) localStorage.setItem("av_match_tenant", tenantId);
    } catch {}
  }, [tenantId]);

  // parse file (xlsx/csv); produce preview rows (first 200)
  const handleFile = useCallback(async (file: File | null) => {
    setParsingError(null);
    setFilePreviewRows([]);
    if (!file) return;
    setParsing(true);

    try {
      const mod = await import("xlsx");
      const XLSX = (mod && (mod as any).default) ? (mod as any).default : mod;
      if (!XLSX || typeof XLSX.read !== "function") {
        throw new Error("xlsx library does not expose read()");
      }

      const name = (file.name || "").toLowerCase();
      let wb: any;
      if (name.endsWith(".csv")) {
        const text = await file.text();
        wb = XLSX.read(text, { type: "string", raw: false });
      } else {
        const arrayBuffer = await file.arrayBuffer();
        wb = XLSX.read(arrayBuffer, { type: "array", raw: false });
      }

      if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) {
        throw new Error("Workbook empty or unreadable");
      }

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

      setFilePreviewRows(mapped);
    } catch (err: any) {
      console.error("Failed to parse uploaded file:", err);
      const msg = err?.message ?? String(err);
      setParsingError(msg);
      alert(`Failed to parse file: ${msg}\nSee console for details.`);
    } finally {
      setParsing(false);
    }
  }, []);

  // create job from preview rows (includes tenant_id)
  const createJob = useCallback(async (rows?: PreviewRow[]) => {
    const payloadRows = (rows ?? filePreviewRows) || [];
    if (!payloadRows.length) {
      alert("No preview rows to create job from.");
      return null;
    }
    if (!tenantId || !isUuid(tenantId)) {
      setTenantError("Please provide a valid tenant UUID before creating a job.");
      alert("Tenant UUID missing or invalid. Please enter a valid tenant UUID.");
      return null;
    }
    setTenantError(null);
    setCreatingJob(true);
    try {
      const body = { tenant_id: tenantId, file_name: `upload-${Date.now()}`, rows: payloadRows.map((r) => ({ ...r, raw: r.raw })) };
      const res = await fetch("/api/v1/match/url-jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        console.error("create job failed:", j);
        alert("Create job failed: " + (j?.error ?? res.statusText));
        return null;
      }
      setJobId(j.job_id);
      await fetchJobStatus(j.job_id);
      return j.job_id;
    } catch (err) {
      console.error("createJob error:", err);
      alert("Create job failed (see console).");
      return null;
    } finally {
      setCreatingJob(false);
    }
  }, [filePreviewRows, tenantId]);

  // Start processing job (server-side worker)
  const startJob = useCallback(async (id?: string | null) => {
    const jid = id ?? jobId;
    if (!jid) return alert("No job selected to start.");
    setStartingJob(true);
    try {
      const res = await fetch(`/api/v1/match/url-jobs/${encodeURIComponent(jid)}/start`, { method: "POST" });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        console.error("start job failed", j);
        alert("Start job failed: " + (j?.error ?? res.statusText));
        return;
      }
      pollJobStatus(jid);
    } catch (err) {
      console.error("startJob error", err);
    } finally {
      setStartingJob(false);
    }
  }, [jobId]);

  // combined action: create then start
  const createAndStart = useCallback(async () => {
    const jid = await createJob();
    if (jid) await startJob(jid);
  }, [createJob, startJob]);

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
  }, [fetchJobStatus, resultsStatusFilter, resultsLimit, resultsOffset]);

  // fetch rows from job (paged)
  async function fetchResultsRows(id: string, status?: string | undefined, limit = 50, offset = 0) {
    setResultsLoading(true);
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
    } catch (err) {
      console.warn("fetchResultsRows error", err);
      setResultsRows([]);
    } finally {
      setResultsLoading(false);
    }
  }

  // approve candidate (calls server approve endpoint)
  const approveCandidate = useCallback(async (rowIdentifier: string, candidateUrl: string) => {
    if (!jobId) return alert("No job context");
    if (!confirm("Approve this candidate URL and mark row resolved?")) return;
    try {
      const res = await fetch(`/api/v1/match/url-jobs/${encodeURIComponent(jobId)}/rows/${encodeURIComponent(rowIdentifier)}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved_url: candidateUrl })
      });
      const j = await res.json();
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
  }, [jobId, resultsLimit, resultsOffset, resultsStatusFilter]);

  // bulk approve selected (UI components supply selection)
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

  // props for child components (cast to any)
  const uploadProps = useMemo(() => ({ onFile: handleFile }), [handleFile]);
  const resultsTableProps = useMemo(() => ({ rows: resultsRows, loading: resultsLoading, selectedRowIds, toggleRowSelection, onRefresh: () => jobId && fetchResultsRows(jobId, resultsStatusFilter, resultsLimit, resultsOffset), approveCandidate }), [resultsRows, resultsLoading, selectedRowIds, toggleRowSelection, jobId, resultsLimit, resultsOffset, resultsStatusFilter, approveCandidate]);
  const bulkActionsProps = useMemo(() => ({ selectedCount: Object.keys(selectedRowIds).filter((k) => selectedRowIds[k]).length, onBulkApprove: bulkApproveSelected, onClearSelection: clearSelection }), [selectedRowIds, bulkApproveSelected, clearSelection]);

  // components cast to any safe renderer
  const UploadComp: any = UploadPastePanel as any;
  const FiltersComp: any = MatchFilters as any;
  const ResultsComp: any = ResultsTable as any;
  const BulkComp: any = BulkActions as any;
  const JobProgressComp: any = JobProgress as any;

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
              <div className="mt-2 font-mono text-sm">{jobId ? `job:${jobId}` : "No job"}</div>
              <div className="mt-2 text-xs text-slate-500">{jobStatus ? jobStatus.status : "status: —"}</div>
              <div className="mt-3 space-y-2">
                <div>
                  <input
                    placeholder="Tenant UUID"
                    value={tenantId ?? ""}
                    onChange={(e) => { setTenantId(e.target.value.trim()); if (tenantError) setTenantError(null); }}
                    className="w-full rounded border px-2 py-1 text-xs"
                  />
                  {tenantError ? <div className="text-xs text-red-600 mt-1">{tenantError}</div> : <div className="text-xs text-slate-400 mt-1">Provide tenant UUID (required)</div>}
                </div>

                <button onClick={() => createAndStart()} disabled={parsing || creatingJob || !filePreviewRows.length || !tenantId || !isUuid(tenantId)} className="w-full rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-60">
                  {creatingJob || startingJob ? "Working…" : "Upload & Create"}
                </button>
                <button onClick={() => createJob()} disabled={parsing || creatingJob || !filePreviewRows.length || !tenantId || !isUuid(tenantId)} className="w-full rounded border px-3 py-2 text-sm disabled:opacity-60">
                  {creatingJob ? "Creating…" : "Create job from preview"}
                </button>
                <button onClick={() => startJob(jobId)} disabled={!jobId || startingJob || polling} className="w-full rounded border px-3 py-2 text-sm disabled:opacity-60">
                  {startingJob || polling ? "Starting…" : "Start resolve"}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Grid */}
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

            {/* Filters + Bulk actions */}
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

            {/* Results table */}
            <div className="rounded-2xl border bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">3 · Review results</h2>
                <div className="text-xs text-slate-500">Live match grid</div>
              </div>

              <div className="mt-2">
                <ResultsComp {...resultsTableProps} />
              </div>
            </div>
          </div>

          {/* Right column: job progress & tips */}
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
