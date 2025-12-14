"use client";
import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supa = createClient(SUPA_URL, SUPA_ANON);

export default function NewImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const router = useRouter();

  function readPreview(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext === "csv" || ext === "txt") {
      Papa.parse(f, {
        header: true,
        preview: 20,
        complete: (res) => {
          setHeaders(res.meta.fields ?? []);
          setPreviewRows(res.data as any[]);
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const ab = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(ab, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];
        setHeaders(rows.length ? Object.keys(rows[0]) : []);
        setPreviewRows(rows.slice(0, 20));
      };
      reader.readAsArrayBuffer(f);
    }
  }

  async function handleUpload() {
    if (!file) return;
    const path = `imports/${Date.now()}-${file.name}`;
    const { error } = await supa.storage.from("imports").upload(path, file, { upsert: false });
    if (error) {
      alert("Upload failed: " + error.message);
      return;
    }
    // Create job
    const res = await fetch("/api/imports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        file_path: `imports/${path}`,
        file_name: file.name,
        file_format: file.name.split(".").pop(),
      }),
    });
    const json = await res.json();
    if (json.ok) {
      router.push(`/imports/${json.jobId}`);
    } else {
      alert("Import job failed: " + json.error);
    }
  }

  return (
    <div>
      <h1>Create import</h1>
      <input
        type="file"
        accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          if (f) readPreview(f);
        }}
      />
      {headers.length > 0 && (
        <>
          <h3>Preview headers</h3>
          <pre>{JSON.stringify(headers)}</pre>
          <h3>Preview rows</h3>
          <pre>{JSON.stringify(previewRows.slice(0, 5), null, 2)}</pre>
          <button onClick={handleUpload}>Upload & Create Import</button>
        </>
      )}
    </div>
  );
}
