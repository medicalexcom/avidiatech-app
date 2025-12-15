"use client";

import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Props = {
  bucket?: string;
  maxRows?: number;
  maxCols?: number;
  onCreated?: (jobId: string) => void;
  className?: string;
  platform?: string; // new: optional platform to include with import
};

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supa = SUPA_URL && SUPA_ANON ? createClient(SUPA_URL, SUPA_ANON) : null;

/**
 * Reusable ImportUploader
 * - Preview CSV/XLSX using dynamic imports (papaparse/xlsx).
 * - Upload to Supabase Storage and call POST /api/imports to create a server-side job.
 */
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
  const [uploading, setUploading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function readPreview(f: File) {
    setPreviewError(null);
    setLoadingPreview(true);
    setHeaders([]);
    setPreviewRows([]);

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
    if (!supa) {
      setPreviewError("Supabase client not configured (missing env vars)");
      return;
    }

    if (headers.length > maxCols) {
      setPreviewError(`Too many columns (max ${maxCols}). Please reduce columns.`);
      return;
    }

    setUploading(true);
    try {
      const storagePath = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supa.storage.from(bucket).upload(storagePath, file, { upsert: false });
      if (uploadError) {
        setPreviewError(`Upload failed: ${uploadError.message}`);
        return;
      }

      const res = await fetch("/api/imports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          file_path: `${bucket}/${storagePath}`,
          file_name: file.name,
          file_format: file.name.split(".").pop()?.toLowerCase(),
          platform, // include platform selection for server-side mapping
        }),
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
      <div className="mt-3">
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
          <div className="text-xs text-slate-500">Preview headers</div>
          <pre className="mt-2 text-xs overflow-auto bg-slate-50 p-2 rounded">{JSON.stringify(headers)}</pre>

          <div className="mt-3 text-xs text-slate-500">Preview rows</div>
          <pre className="mt-2 text-xs overflow-auto bg-slate-50 p-2 rounded">{JSON.stringify(previewRows.slice(0, 5), null, 2)}</pre>

          <div className="mt-4 flex gap-2">
            <button onClick={handleUpload} disabled={uploading} className="inline-flex items-center rounded px-3 py-2 bg-slate-900 text-white text-sm disabled:opacity-60">
              {uploading ? "Uploading…" : "Upload & Create Import"}
            </button>

            <button
              onClick={() => {
                setFile(null);
                setHeaders([]);
                setPreviewRows([]);
                setPreviewError(null);
              }}
              className="inline-flex items-center rounded px-3 py-2 bg-white border text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
