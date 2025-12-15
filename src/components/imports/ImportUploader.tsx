"use client";

import React, { useEffect, useRef, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/toast";

/**
 * A self-contained ImportUploader that:
 * - requires an authenticated session before allowing uploads
 * - uploads files to the specified Supabase storage bucket
 * - calls the backend to create an import job and invokes onCreated(jobId)
 *
 * Usage:
 * <ImportUploader bucket="imports" onCreated={(jobId) => { ... }} />
 *
 * Notes:
 * - Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
 * - The backend endpoint used to create the import job is POST /api/v1/imports
 *   and expects JSON like { bucket, path, filename }. Adjust the endpoint/body
 *   if your backend differs.
 */

type Props = {
  bucket?: string;
  onCreated?: (jobId: string | null) => void;
};

export default function ImportUploader({ bucket = "imports", onCreated }: Props) {
  const toast = useToast();
  const [supabase] = useState<SupabaseClient>(() =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
    )
  );

  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data?.session ?? null);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setChecking(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });

    return () => subscription?.unsubscribe?.() ?? undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(file: File) {
    if (!file) return;
    if (!session) {
      toast?.error?.("You must be signed in to upload.");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // chosen path: timestamp + sanitized filename
      const ts = Date.now();
      const safeName = file.name.replace(/\s+/g, "_");
      const path = `${ts}-${safeName}`;

      // upload to Supabase Storage
      const uploadRes = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadRes.error) {
        throw uploadRes.error;
      }

      // Optionally you can track progress with fetch + xhr or presigned urls;
      // supabase-js storage upload does not expose progress in v2 currently.

      // Call backend to create an import job referencing the stored file
      // Adjust this route/body if your API expects different fields.
      const resp = await fetch("/api/v1/imports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bucket,
          path: uploadRes.data.path,
          filename: file.name,
        }),
      });

      const j = await resp.json().catch(() => null);

      if (!resp.ok) {
        // backend failed to create import job
        toast?.error?.(j?.error ?? j?.message ?? "Failed to create import job");
        onCreated?.(null);
      } else {
        // try common keys for job id
        const jobId = j?.jobId ?? j?.id ?? j?.data?.id ?? null;
        if (jobId) {
          toast?.success?.(`Import job created: ${jobId}`);
        } else {
          toast?.info?.("Upload succeeded; import job created.");
        }
        onCreated?.(jobId);
      }
    } catch (err: any) {
      toast?.error?.(String(err?.message ?? err));
      onCreated?.(null);
    } finally {
      setUploading(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onChangeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    handleFile(f);
  }

  // UI: If still checking session show loader
  if (checking) return <div className="p-3 text-xs text-slate-500">Checking authentication…</div>;

  // If not authenticated, show CTA to sign in
  if (!session) {
    return (
      <div className="rounded border p-4 bg-yellow-50 text-sm">
        <div className="font-medium mb-2">Sign in required to upload</div>
        <div className="text-xs text-slate-700 mb-3">
          You must sign in to upload files. This ensures uploads are associated with your account.
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              // recommend redirecting to your sign-in page
              window.location.href = "/sign-in";
            }}
            className="px-3 py-2 bg-sky-600 text-white rounded"
          >
            Sign in
          </button>
          <button
            onClick={() => {
              toast?.info?.("If you don't have an account, create one to upload files.");
            }}
            className="px-3 py-2 border rounded"
          >
            Learn more
          </button>
        </div>
      </div>
    );
  }

  // Authenticated UI: file input and basic status
  return (
    <div className="space-y-2">
      <label className="text-xs text-slate-600">Upload file (CSV / XLSX)</label>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".csv, .xlsx, .xls"
          onChange={onChangeFile}
          disabled={uploading}
          className="text-sm"
        />
        <button
          onClick={() => {
            if (inputRef.current) inputRef.current.click();
          }}
          disabled={uploading}
          className="px-3 py-2 bg-slate-800 text-white rounded text-sm"
        >
          {uploading ? "Uploading…" : "Choose file"}
        </button>
        {uploading && <div className="text-xs text-slate-500">Uploading…</div>}
      </div>
      <div className="text-xs text-slate-500">
        Tip: max 5,000 rows. After upload the import job will be created automatically.
      </div>
    </div>
  );
}
