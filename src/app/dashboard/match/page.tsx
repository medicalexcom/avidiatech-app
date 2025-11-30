"use client";
import React from "react";
import UploadPastePanel from "./_components/UploadPastePanel";
import JobProgress from "./_components/JobProgress";
import MatchFilters from "./_components/MatchFilters";
import ResultsTable from "./_components/ResultsTable";
import BulkActions from "./_components/BulkActions";

export default function MatchPage() {
  if (process.env.NEXT_PUBLIC_FEATURE_MATCH !== "true" && process.env.FEATURE_MATCH !== "true") {
    return <div>Feature not enabled.</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>AvidiaMatch</h1>
      <UploadPastePanel />
      <JobProgress />
      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <MatchFilters />
        <BulkActions />
      </div>
      <ResultsTable />
    </div>
  );
}
