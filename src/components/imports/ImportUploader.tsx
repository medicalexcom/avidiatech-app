"use client";

import React, { useState } from "react";
import MappingModal from "@/components/imports/MappingModal";

type Props = {
  bucket?: string;
  maxRows?: number;
  maxCols?: number;
  onCreated?: (jobId: string) => void;
  className?: string;
  platform?: string;
};

export default function ImportUploader({
  bucket = "imports",
  maxRows = 5000,
  maxCols = 50,
  onCreated,
  className,
  platform,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Mapping modal
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string> | null>(null);

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
      } else {
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
      // Upload to server-side route which will upload to Supabase using the service role.
      const fd = new FormData();
      fd.append("file", file, file.name);

      const uploadResp = await fetch("/api/upload-to-supabase", {
        method: "POST",
        body: fd,
      });

      if (uploadResp.status === 401) {
        setPreviewError("You must be signed in to upload. Please sign in and try again.");
        return;
      }

      const uploadJson = await uploadResp.json().catch(() => null);
      if (!uploadResp.ok) {
        setPreviewError(uploadJson?.error ?? `Upload failed: ${uploadResp.status}`);
        return;
      }

      // The server returns the Supabase upload result in uploadJson.data.
      // Try to derive an object path from common response shapes.
      let uploadedPath: string | undefined = undefined;
      if (uploadJson?.data?.path) uploadedPath = uploadJson.data.path;
      else if (uploadJson?.data?.Key) uploadedPath = uploadJson.data.Key;
      else if (uploadJson?.data?.key) uploadedPath = uploadJson.data.key;
      else if (typeof uploadJson?.data === "string") uploadedPath = uploadJson.data; // fallback

      if (!uploadedPath) {
        // If server returned uploadedBy but not path, still try to proceed if caller expects server to create job.
        // But in most cases we need the path to create the import job.
        setPreviewError("Upload succeeded but server did not return the uploaded path.");
        return;
      }

      // Normalize file_path so it includes the bucket prefix.
      let filePath = uploadedPath;
      if (!filePath.startsWith(`${bucket}/`) && !filePath.startsWith("/")) {
        filePath = `${bucket}/${filePath}`;
      }

      const bodyObj: any = {
        file_path: filePath,
        file_name: file.name,
        file_format: file.name.split(".").pop()?.toLowerCase(),
        mapping: mapping ?? null,
        platform: platform ?? null,
      };

      const res = await fetch("/api/imports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(bodyObj),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setPreviewError(json?.error ?? `Create import job failed: ${res.status}`);
        return;
      }

      const jobId = json.jobId ?? json.id ?? null;
      onCreated?.(jobId ?? "");
    } catch (err: any) {
      setPreviewError(String(err?.message || err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className}>
      <div>
        <input
          type="file"
          accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
