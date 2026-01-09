"use client";
import React, { useState } from "react";
import IntegrationList from "@/components/connectors/IntegrationList";

export default function IntegrationsPage() {
  const [viewGrid, setViewGrid] = useState(false);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Integrations</h1>
            <p className="text-sm text-slate-600">Connect and manage your stores and third-party integrations for this organization.</p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setViewGrid(false)} className={`px-3 py-1 rounded ${!viewGrid ? "bg-slate-900 text-white" : "border"}`}>List</button>
            <button onClick={() => setViewGrid(true)} className={`px-3 py-1 rounded ${viewGrid ? "bg-slate-900 text-white" : "border"}`}>Grid</button>
            <a href="/integrations/new" className="px-3 py-1 rounded bg-emerald-600 text-white">Add store</a>
          </div>
        </div>
      </header>

      <main>
        <IntegrationList compact={!viewGrid} />
      </main>
    </div>
  );
}
