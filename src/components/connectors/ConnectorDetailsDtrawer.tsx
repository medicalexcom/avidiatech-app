import React from "react";

export function ConnectorDetailsDrawer({ open, onClose, integration }: { open: boolean; onClose: () => void; integration?: any }) {
  if (!open) return null;
  return (
    <aside role="dialog" aria-modal="true" className="fixed right-0 top-0 h-full w-full md:w-96 bg-white shadow-lg z-50 p-4 overflow-auto">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{integration?.name ?? "Integration details"}</h3>
        <button onClick={onClose} aria-label="Close">Close</button>
      </div>
      <div className="mt-4">
        <p><strong>Provider:</strong> {integration?.provider}</p>
        <p><strong>Status:</strong> {integration?.status}</p>
        <p><strong>Last synced:</strong> {integration?.last_synced_at ?? "n/a"}</p>
        <div className="mt-3">
          <h4 className="font-medium">Last error</h4>
          <pre className="mt-1 p-2 bg-gray-50 rounded text-sm">{integration?.last_error ?? "No recent errors"}</pre>
        </div>
      </div>
    </aside>
  );
}
