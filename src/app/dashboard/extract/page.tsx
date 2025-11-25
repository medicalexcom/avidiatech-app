"use client";
import React, { useState } from "react";
import ExtractHeader from "@/components/ExtractHeader";
import JsonViewer from "@/components/JsonViewer";
import TabsShell from "@/components/TabsShell";
import { useIngestRow } from "@/hooks/useIngestRow";

/**
 * ExtractView – dual-pane page
 */
export default function ExtractView() {
  const [jobId, setJobId] = useState<string | null>(null);

  // useIngestRow polls the GET /api/v1/ingest/:id and returns the job row
  const { row, loading, error } = useIngestRow(jobId);

  return (
    <div style={{ padding: 20 }}>
      <ExtractHeader onJobCreated={(id) => setJobId(id)} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 460px", gap: 20, marginTop: 20 }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, minHeight: 380 }}>
          {/* Left pane: Tabs show only when we have row (or partial raw data) */}
          <TabsShell
            job={row}
            loading={loading}
            error={error}
            noDataMessage={!jobId ? "Submit a URL to start extraction" : "Waiting for extraction..."}
          />
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, height: "min(80vh, 1200px)", overflow: "auto" }}>
          <h4 style={{ marginTop: 0 }}>JSON Output</h4>
          <JsonViewer data={row?.normalized_payload ?? row ?? {}} loading={!row && !!jobId} />
        </div>
      </div>
    </div>
  );
}
