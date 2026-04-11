"use client";

import React, { useEffect, useState } from "react";
import MappingModal from "@/components/imports/MappingModal";
import { useToast } from "@/components/ui/toast";

/**
 * ImportUploader
 *
 * - Uploads files to the server endpoint /api/upload-to-supabase (server will store to Supabase storage
 *   with the service role and create a product_ingestions row when possible).
 * - Sends optional mapping & platform metadata so the ingestion row can be updated/created with them.
 * - If the upload endpoint returns a jobId, the uploader calls onCreated(jobId).
 * - If the upload endpoint only returns a file path, the uploader POSTs to /api/imports to create the import job.
 *
 * Drop this file in place of your existing ImportUploader. It is defensive and reports helpful errors.
 */

type Props = {
  bucket?: string; // informational - server controls actual bucket
  maxRows?: number;
  maxCols?: number;
  onCreated?: (jobId: string) => void;
  className?: string;
  platform?: string | null;
};

export default function ImportUploader({
  bucket = "imports",
  maxRows = 5000,
  maxCols = 50,
  onCreated,
  className,
  platform = null,
}: Props) {
  const toast = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [mappingOpen, setMappingOpen] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    // Reset preview error when file changes
    if (!file) {
      setHeaders([]);
      setPreviewRows([]);
      setPreviewError(null);
    }
  }, [file]);

  async function readPreview(f: File) {
    setPreviewError(null);
    setLoadingPreview(true);
    setHeaders([]);
    setPreviewRows([]);
    setMapping(null);

    try {
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (ext === "csv" || ext === "txt") {
        const PapaMod = await import("papaparse");
        const Papa = (PapaMod && (PapaMod.default ?? PapaMod)) as any;
        await new Promise<void>((resolve, reject) => {
          Papa.parse(f, {
            header: true,
            preview: 50,
            skipEmptyLines: true,
            complete: (res: any) => {
              setHeaders(res.meta?.fields ?? []);
              setPreviewRows(res.data ?? []);
              resolve();
            },
            error: (err: any) => reject(err),
          });
        });
      } else if (ext === "xlsx" || ext === "xls") {
        const XLSX = (await import("xlsx")) as any;
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const ab = e.target?.result as ArrayBuffer;
            const wb = XLSX.read(ab, { type: "array" });
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }) as any[];
            setHeaders(rows.length ? Object.keys(rows[0]) : []);
            setPreviewRows(rows.slice(0, 50));
          } catch (err: any) {
            setPreviewError(err?.message ?? String(err));
          } finally {
            setLoadingPreview(false);
          }
        };
        reader.onerror = () => {
          setPreviewError("Failed to read file for preview");
          setLoadingPreview(false);
        };
        reader.readAsArrayBuffer(f);
        return;
      } else {
        // Not a tabular format we can preview — bail gracefully
        setPreviewError("Preview unavailable for this file type");
      }
    } catch (err: any) {
      setPreviewError(err?.message ?? String(err));
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleUpload() {
    setPreviewError(null);
    if (!file) {
      setPreviewError("No file selected");
      return;
    }

    if (headers.length > maxCols) {
      setPreviewError(`Too many columns (max ${maxCols}). Please reduce columns.`);
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);

      // Include mapping & platform as optional fields - server may use them to populate the ingestion row
      if (mapping) {
        try {
          fd.append("mapping", JSON.stringify(mapping));
        } catch (e) {
          // ignore mapping serialization errors
        }
      }
      if (platform) fd.append("platform", String(platform));

      const uploadResp = await fetch("/api/upload-to-supabase", {
        method: "POST",
        body: fd,
      });

      const uploadJson = await uploadResp.json().catch(() => null);

      if (!uploadResp.ok || !uploadJson?.ok) {
        const msg = uploadJson?.error ?? `Upload failed: ${uploadResp.status}`;
        setPreviewError(msg);
        toast?.error?.(msg);
        return;
      }

      // If server route created the ingestion row and returned jobId, use it
      const jobIdFromUpload: string | null = uploadJson?.jobId ?? uploadJson?.data?.id ?? uploadJson?.inserted?.id ?? null;

      // The server should return canonical file_path (e.g. "imports/12345-name.xlsx") or relative path in uploadJson.data.path
      const returnedPath: string | null = uploadJson?.file_path ?? uploadJson?.data?.path ?? uploadJson?.data?.raw?.fullPath ?? uploadJson?.data?.raw?.path ?? null;

      // If jobId returned, optionally patch mapping to the ingestion record (best-effort) and finish
      if (jobIdFromUpload) {
        // Best-effort: update mapping via PATCH to PostgREST /api/v1/ingest/{id} if mapping exists
        if (mapping) {
          try {
            await fetch(`/api/v1/ingest/${encodeURIComponent(jobIdFromUpload)}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ mapping }),
            });
          } catch {
            // ignore patch failures — mapping is best-effort
          }
        }

        toast?.success?.(`Upload succeeded — job ${jobIdFromUpload}`);
        onCreated?.(jobIdFromUpload);
        return;
      }

      // If no jobId returned but we have returnedPath, call /api/imports to create an import job (old behavior)
      const effectivePath = returnedPath ? String(returnedPath) : null;
      if (!jobIdFromUpload && effectivePath) {
        // Normalize file_path to include bucket if server returned relative path
        const filePath =
          effectivePath.startsWith(`${bucket}/`) || effectivePath.startsWith("/") ? effectivePath.replace(/^\/+/, "") : `${bucket}/${effectivePath}`;

        // Create import job by calling /api/imports (server route will create DB row and return jobId)
        try {
          const createResp = await fetch("/api/imports", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              file_path: filePath,
              file_name: file.name,
              file_format: file.name.split(".").pop()?.toLowerCase() ?? null,
              mapping: mapping ?? null,
              platform: platform ?? null,
            }),
          });
          const createJson = await createResp.json().catch(() => null);
          if (!createResp.ok || !createJson?.ok) {
            const msg = createJson?.error ?? `Create import job failed: ${createResp.status}`;
            setPreviewError(msg);
            toast?.error?.(msg);
            return;
          }
          const jobId = createJson.jobId ?? createJson.id ?? createJson.data?.id ?? null;
          if (jobId) {
            toast?.success?.(`Import job created: ${jobId}`);
            onCreated?.(jobId);
            return;
          } else {
            // create succeeded but no job id returned — fallback to telling user upload succeeded
            toast?.info?.("Upload succeeded; import job created (no id returned).");
            onCreated?.("");
            return;
          }
        } catch (err: any) {
          const msg = String(err?.message ?? err);
          setPreviewError(msg);
          toast?.error?.(msg);
          return;
        }
      }

      // If we reach here, upload succeeded but we couldn't determine job id or path
      toast?.info?.("Upload succeeded but no job id/path returned from server. Check server logs.");
      onCreated?.("");
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      setPreviewError(msg);
      toast?.error?.(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className}>
      <div>
        <input
          type="file"
          accept="*/*"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f) readPreview(f);
          }}
        />
      </div>

      {loadingPreview && <div className="mt-3 text-sm">Loading preview…</div>}
      {previewError && <div className="mt-3 text-sm text-rose-700">{previewError}</div>}

      {headers.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">Preview headers</div>
            <div>
              <button onClick={() => setMappingOpen(true)} className="text-xs px-2 py-1 border rounded mr-2">
                Open mapping
              </button>
              <button
                onClick={() => {
                  setHeaders([]);
                  setPreviewRows([]);
                  setFile(null);
                  setMapping(null);
                }}
                className="text-xs px-2 py-1 border rounded"
              >
                Clear
              </button>
            </div>
          </div>

          <pre className="mt-2 text-xs overflow-auto bg-slate-50 p-2 rounded">{JSON.stringify(headers)}</pre>

          <div className="mt-3 text-xs text-slate-500">Preview rows</div>
          <pre className="mt-2 text-xs overflow-auto bg-slate-50 p-2 rounded">{JSON.stringify(previewRows.slice(0, 5), null, 2)}</pre>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="inline-flex items-center rounded px-3 py-2 bg-slate-900 text-white text-sm disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Upload & Create Import"}
            </button>
          </div>
        </div>
      )}

      {/* If headers not available (non-tabular file), still allow upload */}
      {!headers.length && !loadingPreview && (
        <div className="mt-3">
          <div className="text-xs text-slate-500 mb-2">No preview available for this file type. You can still upload.</div>
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="inline-flex items-center rounded px-3 py-2 bg-slate-900 text-white text-sm disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Upload & Create Import"}
            </button>
            <button
              onClick={() => {
                setFile(null);
                setPreviewError(null);
              }}
              className="inline-flex items-center rounded px-3 py-2 border text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <MappingModal
        open={mappingOpen}
        headers={headers}
        initialMapping={mapping ?? {}}
        onSave={(m) => {
          setMapping(m);
          setMappingOpen(false);
        }}
        onClose={() => setMappingOpen(false)}
      />
    </div>
  );
}
