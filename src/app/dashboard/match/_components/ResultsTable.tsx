"use client";
import React, { useEffect, useState } from "react";

export default function ResultsTable() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    // stub: in real UI we will poll job endpoint and populate rows
  }, []);

  if (!rows.length) {
    return <div style={{ marginTop: 12 }}>No results yet.</div>;
  }

  return (
    <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
      <thead><tr><th>SKU</th><th>Brand</th><th>Suggested URL</th><th>Confidence</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.sku}</td>
            <td>{r.brand_hint}</td>
            <td><a href={r.candidate_url} target="_blank" rel="noreferrer">{r.candidate_url}</a></td>
            <td>{(r.confidence || 0).toFixed(2)}</td>
            <td>{r.status}</td>
            <td>
              <button>Confirm</button>
              <button>Reject</button>
              <button>Ingest</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
