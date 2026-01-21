"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import UploadPastePanel from "./_components/UploadPastePanel";
import JobProgress from "./_components/JobProgress";
import MatchFilters from "./_components/MatchFilters";
import ResultsTable from "./_components/ResultsTable";
import BulkActions from "./_components/BulkActions";

/**
 * MatchPage — shows fallback rows, resolved URLs and CSV export
 *
 * Required fields for matching:
 * - supplier_name (Supplier Name)
 * - sku (SKU / Item SKU / MPN)
 *
 * Optional fields:
 * - ndc_item_code, product_name, brand_name, price, etc.
 *
 * Notes:
 * - We keep ALL original columns intact under `raw` so exports preserve extra fields.
 * - Preview warns if rows are missing required columns so users don't start jobs with empty values.
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

function escapeCsv(value: any) {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : String(value);
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function pickFirstField(row: any, keys: string[]) {
  for (const k of keys) {
    if (row && Object.prototype.hasOwnProperty.call(row, k)) return row[k];
  }
  return undefined;
}

function toStr(v: any) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

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

      const mapped: PreviewRow[] = rawJson.slice(0, 200).map((r: any, i: number) => {
        const supplier_name = toStr(
          pickFirstField(r, ["Supplier Name", "supplier_name", "supplier", "Vendor", "vendor", "Supplier", "supplierName"]) ?? ""
        );

        const sku = toStr(
          pickFirstField(r, ["SKU", "sku", "Item SKU", "item_sku", "MPN", "mpn", "Part Number", "part_number"]) ?? ""
        );

        const ndc_item_code = toStr(pickFirstField(r, ["NDC Item Code", "ndc_item_code", "NDC", "ndc"]) ?? "");
        const product_name = toStr(pickFirstField(r, ["Product Name", "product_name", "Item Name", "name", "title"]) ?? "");
        const brand_name = toStr(pickFirstField(r, ["Brand Name", "brand_name", "Brand", "brand"]) ?? "");

        return {
          row_id: String(i + 1),
          supplier_name,
          sku,
          ndc_item_code,
          product_name,
          brand_name,
          raw: r
        };
      });

      setFilePreviewRows(mapped);
    } catch (err: any) {
      console.error("Failed to parse uploaded file:", err);
      setParsingError(String(err?.message ?? err));
      alert(`Failed to parse file: ${String(err?.message ?? err)} — see console`);
    } finally {
      setParsing(false);
    }
  }, []);

  const previewStats = useMemo(() => {
    const total = filePreviewRows.length;
    const valid = filePreviewRows.filter((r) => (r.supplier_name || "").trim() && (r.sku || "").trim()).length;
    const missing = total - valid;
    return { total, valid, missing };
  }, [filePreviewRows]);

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
  const fetchResultsRows = useCallback(async (id: string, status?: string | undefined, limit = 50, offset = 0) => {
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

    const good = payloadRows.filter((r) => (r.supplier_name || "").trim() && (r.sku || "").trim());
    if (!good.length) {
      alert("No valid rows found. Required columns: Supplier Name + SKU.");
      return null;
    }

    const dropped = payloadRows.length - good.length;
    if (dropped > 0) {
      const ok = confirm(
        `${dropped} preview row(s) are missing required fields (Supplier Name and/or SKU) and will be ignored.\n\nContinue with ${good.length} valid row(s)?`
      );
      if (!ok) return null;
    }

    setCreatingJob(true);
    try {
      const body = { file_name: `upload-${Date.now()}`, rows: good.map((r) => ({ ...r, raw: r.raw })) };
      const res = await fetch("/api/v1/match/url-jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
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
  }, [filePreviewRows, fetchJobStatus, fetchResultsRows, resultsLimit, resultsOffset, resultsStatusFilter]);

  // start job
  const startJob = useCallback(async (id?: string | null) => {
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
  }, [jobId, pollJobStatus]);

  // combined action: create then start
  const createAndStart = useCallback(async () => {
    const jid = await createJob();
    if (jid) await startJob(jid);
  }, [createJob, startJob]);

  // retry unresolved
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
  }, [selectedRowIds, resultsRows, jobId, approveCandidate, resultsLimit, resultsOffset, resultsStatusFilter, clearSelection, fetchResultsRows]);

  // CSV export
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

  // child props
  const uploadProps = useMemo(() => ({ onFile: handleFile }), [handleFile]);
  const resultsTableProps = useMemo(() => ({
    rows: resultsRows,
    loading: resultsLoading,
    selectedRowIds,
    toggleRowSelection,
    onRefresh: () => jobId && fetchResultsRows(jobId, resultsStatusFilter, resultsLimit, resultsOffset),
    approveCandidate
  }), [resultsRows, resultsLoading, selectedRowIds, toggleRowSelection, jobId, fetchResultsRows, resultsStatusFilter, resultsLimit, resultsOffset, approveCandidate]);

  const bulkActionsProps = useMemo(() => ({
    selectedCount: Object.keys(selectedRowIds).filter((k) => selectedRowIds[k]).length,
    onBulkApprove: bulkApproveSelected,
    onClearSelection: clearSelection
  }), [selectedRowIds, bulkApproveSelected, clearSelection]);

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
      <div className="px-4 py-4 sm:px-6 lg:px-10 lg:py-6 max-w-7xl mx-auto">
        {/* Header (title + subtitle only) */}
        <div className="mb-3">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-slate-500">
            Data Intelligence · AvidiaMatch
          </div>
          <h1 className="mt-2 text-2xl font-bold">Match — SKU → Product URL</h1>
          <p className="text-sm text-slate-600">Upload competitor/product sheets, create jobs and verify candidate URLs.</p>
        </div>

        {/* TOP ROW: Upload (left) + Job (right) */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Upload panel should be the main card on load (left) */}
          <div className="rounded-2xl border bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">1 · Upload or paste data</h2>
                <p className="text-xs text-slate-500">Upload XLSX/CSV or paste rows.</p>
              </div>
            </div>

            <div className="mt-2 space-y-2">
              <UploadComp {...uploadProps} />

              <div className="flex flex-wrap items-center gap-3">
                <input
                  id="match-upload-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  className="rounded border p-2 text-xs"
                />
                <label htmlFor="match-upload-file" className="text-xs text-slate-500">Upload XLSX/CSV</label>
                {parsing && <div className="text-xs text-slate-500">Parsing…</div>}
              </div>

              <div className="rounded-lg border bg-slate-50 p-2 text-xs text-slate-700">
                <div className="font-semibold text-slate-800">Required columns</div>
                <div className="mt-0.5">
                  <span className="font-medium">Supplier Name</span> and <span className="font-medium">SKU</span>.
                  Optional columns (NDC, Price, etc.) are preserved in export.
                </div>
                <div className="mt-1 grid gap-1 sm:grid-cols-2">
                  <div><span className="font-medium">Supplier Name</span> (aliases: supplier, supplier_name, Vendor)</div>
                  <div><span className="font-medium">SKU</span> (aliases: sku, Item SKU, mpn, Part Number)</div>
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-600">Example headers: Supplier Name,SKU,Product Name</div>
              </div>

              {parsingError ? <div className="text-xs text-red-600">Parse error: {parsingError}</div> : null}

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                <div>Preview max: 200 rows</div>
                <div>Rows: {previewStats.total}</div>
                <div>Valid: {previewStats.valid}</div>
                {previewStats.missing ? <div className="text-amber-700">Missing required: {previewStats.missing}</div> : null}
              </div>
            </div>
          </div>

          {/* Job card stays on the right */}
          <div className="rounded-xl border p-2 bg-white">
            <div className="text-xs text-slate-500">Job</div>
            <div className="mt-1.5 font-mono text-xs break-all">{jobId ? `job:${jobId}` : "No job"}</div>
            <div className="mt-1 text-xs text-slate-500">{jobStatus ? jobStatus.status : "status: —"}</div>

            <div className="mt-2 space-y-1.5">
              <button
                onClick={() => createAndStart()}
                disabled={parsing || creatingJob || !filePreviewRows.length || previewStats.valid === 0}
                className="w-full rounded bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-60"
              >
                {creatingJob || startingJob ? "Working…" : "Upload & Create"}
              </button>

              <button
                onClick={() => void createJob()}
                disabled={parsing || creatingJob || !filePreviewRows.length || previewStats.valid === 0}
                className="w-full rounded border px-3 py-1.5 text-sm disabled:opacity-60"
              >
                {creatingJob ? "Creating…" : "Create job from preview"}
              </button>

              <button
                onClick={() => void startJob(jobId)}
                disabled={!jobId || startingJob || polling}
                className="w-full rounded border px-3 py-1.5 text-sm disabled:opacity-60"
              >
                {startingJob || polling ? "Starting…" : "Start resolve"}
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => jobId && fetchResultsRows(jobId, resultsStatusFilter, resultsLimit, resultsOffset)}
                  disabled={!jobId}
                  className="w-full rounded border px-2 py-1.5 text-xs"
                >
                  Refresh
                </button>
                <button
                  onClick={() => retryUnresolved()}
                  disabled={!jobId}
                  className="w-full rounded border px-2 py-1.5 text-xs"
                >
                  Retry
                </button>
              </div>

              <button
                onClick={() => exportResultsCsv()}
                disabled={!resultsRows || resultsRows.length === 0}
                className="w-full rounded border px-3 py-1.5 text-xs"
              >
                Download CSV
              </button>
            </div>
          </div>
        </section>

        {/* SECOND ROW: Filters/Bulk + Results + JobProgress/Tips */}
        <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="rounded-2xl border bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">2 · Refine matches</h2>
                  <p className="text-xs text-slate-500">Filter by status and apply bulk actions.</p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <FiltersComp onChangeStatus={(s: string) => {
                  setResultsStatusFilter(s || undefined);
                  if (jobId) fetchResultsRows(jobId, s || undefined, resultsLimit, 0);
                }} />
                <BulkComp {...bulkActionsProps} />
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-3">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold">3 · Review results</h2>
                <div className="text-xs text-slate-500">Live match grid</div>
              </div>

              <div className="mt-1">
                <ResultsComp {...resultsTableProps} />

                {resultsRows && resultsRows.length > 0 ? (
                  <div className="mt-2 rounded-md border bg-white p-2">
                    <h4 className="text-xs font-semibold mb-1">Fallback: Raw rows (simple view)</h4>
                    <div className="overflow-auto">
                      <table className="w-full table-auto text-xs">
                        <thead>
                          <tr className="text-left">
                            <th className="px-1.5 py-1">Row ID</th>
                            <th className="px-1.5 py-1">SKU</th>
                            <th className="px-1.5 py-1">Product Name</th>
                            <th className="px-1.5 py-1">Supplier</th>
                            <th className="px-1.5 py-1">Status</th>
                            <th className="px-1.5 py-1">Resolved URL</th>
                            <th className="px-1.5 py-1">Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultsRows.map((r: any) => (
                            <tr key={r.id} className="border-t align-top">
                              <td className="px-1.5 py-1 align-top">{r.row_id ?? r.id}</td>
                              <td className="px-1.5 py-1 align-top">{r.sku}</td>
                              <td className="px-1.5 py-1 align-top">{r.product_name}</td>
                              <td className="px-1.5 py-1 align-top">{r.supplier_name}</td>
                              <td className="px-1.5 py-1 align-top">{r.status}</td>
                              <td className="px-1.5 py-1 align-top">
                                {r.resolved_url ? (
                                  <a href={r.resolved_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                                    {r.resolved_url}
                                  </a>
                                ) : (Array.isArray(r.candidates) && r.candidates.length ? (
                                  <div className="text-[11px] leading-4">
                                    {r.candidates.slice(0, 3).map((c: any, idx: number) => (
                                      <div key={idx}>
                                        <a
                                          href={c.url ?? (typeof c === "string" ? c : "")}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-blue-600 underline"
                                        >
                                          {c.url ?? (c)}
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                ) : <span className="text-[11px] text-slate-500">—</span>)}
                              </td>
                              <td className="px-1.5 py-1 align-top">{r.confidence ?? ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 mt-2">No rows to display yet.</div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-3">
            <div className="rounded-2xl border bg-white p-3">
              <h3 className="text-sm font-semibold">Match queue</h3>
              <div className="mt-2">
                <JobProgressComp
                  jobId={jobId}
                  jobStatus={jobStatus}
                  startJob={() => startJob(jobId)}
                  refresh={() => jobId && fetchJobStatus(jobId)}
                  polling={polling}
                />
              </div>
            </div>

            <div className="rounded-2xl border-dashed bg-slate-50 p-3">
              <h3 className="text-xs font-semibold text-slate-500">Tips for better matching</h3>
              <ul className="mt-1.5 text-xs text-slate-600 space-y-1">
                <li>Supplier Name + SKU are required.</li>
                <li>NDC is optional.</li>
                <li>Product name/brand help verification for sites where SKU is not visible.</li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
