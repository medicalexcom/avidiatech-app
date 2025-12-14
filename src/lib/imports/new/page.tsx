"use client";

import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supa = createClient(SUPA_URL, SUPA_ANON);

export default function NewImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Read a preview of the selected file using dynamic imports (no static papaparse/xlsx import)
  async function readPreview(f: File) {
    setError(null);
    setLoadingPreview(true);
    setPreviewRows([]);
    setHeaders([]);

    try {
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (ext === "csv" || ext === "txt") {
        // dynamic import papaparse for browser parsing
        const PapaMod = await import("papaparse");
        const Papa = (PapaMod && (PapaMod.default ?? PapaMod)) as any;

        await new Promise<void>((resolve, reject) => {
          Papa.parse(f, {
            header: true,
            preview: 20,
            skipEmptyLines: true,
            complete: (res: any) => {
              setHeaders(res.meta?.fields ?? []);
              setPreviewRows(res.data ?? []);
              resolve();
            },
            error: (err: any) => {
              reject(err);
            },
          });
        });
      } else {
        // dynamic import xlsx for browser parsing
        const XLSX = (await import("xlsx")) as any;
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const ab = e.target?.result as ArrayBuffer;
            const wb = XLSX.read(ab, { type: "array" });
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }) as any[];
            setHeaders(rows.length ? Object.keys(rows[0]) : []);
            setPreviewRows(rows.slice(0, 20));
          } catch (err: any) {
            setError(err?.message ?? String(err));
          } finally {
            setLoadingPreview(false);
          }
        };
        reader.onerror = (e) => {
          setError("Failed to read file for preview");
          setLoadingPreview(false);
        };
        reader.readAsArrayBuffer(f);
        // exit early because FileReader callback handles loading state
        return;
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleUpload() {
    if (!file) return setError("No file selected");

    setError(null);

    try {
      // Upload to Supabase Storage bucket 'imports'
      const storagePath = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supa.storage
        .from("imports")
        .upload(storagePath, file, { upsert: false });

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        return;
      }

      // Create import job on the server (server will process the file via service key)
      const res = await fetch("/api/imports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          file_path: `imports/${storagePath}`,
          file_name: file.name,
          file_format: file.name.split(".").pop()?.toLowerCase(),
        }),
      });

      const json = await res.json();
      if (json.ok && json.jobId) {
        router.push(`/imports/${json.jobId}`);
      } else {
        setError(json.error ?? "Failed to create import job");
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Create import</h1>

      <div className="mb-4">
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

      {loadingPreview && <div className="mb-4 text-sm">Loading preview…</div>}

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      {headers.length > 0 && (
        <div className="mb-4">
          <h3 className="font-medium">Preview headers</h3>
          <div className="mt-2 mb-3">
            <pre className="text-xs overflow-auto bg-slate-50 p-2 rounded">{JSON.stringify(headers)}</pre>
          </div>

          <h3 className="font-medium">Preview rows</h3>
          <div className="mt-2">
            <pre className="text-xs overflow-auto bg-slate-50 p-2 rounded">
              {JSON.stringify(previewRows.slice(0, 5), null, 2)}
            </pre>
          </div>

          <div className="mt-4">
            <button
              onClick={handleUpload}
              className="inline-flex items-center rounded px-3 py-2 bg-slate-900 text-white text-sm"
            >
              Upload & Create Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
