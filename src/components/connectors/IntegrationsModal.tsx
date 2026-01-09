"use client";
import React from "react";
import IntegrationList from "@/components/connectors/IntegrationList";

export default function IntegrationsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-3xl p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Manage connections</h2>
          <button onClick={onClose} className="px-3 py-1 text-sm border rounded">Close</button>
        </div>

        <IntegrationList compact={true} />

        <div className="mt-4 text-right">
          <button onClick={onClose} className="px-4 py-2 rounded bg-slate-100">Done</button>
        </div>
      </div>
    </div>
  );
}
