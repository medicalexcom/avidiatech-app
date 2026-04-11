"use client";

import React from "react";
import ImportUploader from "@/components/imports/ImportUploader";

type Props = {
  bucket?: string;
  mappingPreset?: any | null;
  onCreated?: (jobId: string) => void;
};

/**
 * Wraps existing ImportUploader to attach mappingPreset metadata to created import job.
 * After ImportUploader calls onCreated(jobId), this wrapper PATCHes /api/v1/imports/:id
 * with { meta: { mappingPreset } } so the server stores the chosen preset with the job.
 *
 * If your server exposes a different endpoint to attach metadata, change the PATCH URL/body.
 */
export default function ImportUploaderWithPreset({ bucket = "imports", mappingPreset = null, onCreated }: Props) {
  return (
    <ImportUploader
      bucket={bucket}
      onCreated={async (jobId: string) => {
        // let consumer handle first
        onCreated?.(jobId);

        // attach mapping preset metadata if provided
        if (!jobId || !mappingPreset) return;
        try {
          await fetch(`/api/v1/imports/${encodeURIComponent(jobId)}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ meta: { mappingPreset } }),
          });
          // optional: you could fetch/import job here and show toast
        } catch (e) {
          // non-fatal; user still created import
          // console.warn("Failed to attach mapping preset", e);
        }
      }}
    />
  );
}
