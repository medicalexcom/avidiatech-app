"use client";

import React from "react";

type Canned = { id: string; title: string; body: string };

export default function CannedRepliesModal({
  open,
  onClose,
  onInsert,
  canned = defaultCanned,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (text: string) => void;
  canned?: Canned[];
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg w-[min(720px,95%)] max-h-[80vh] overflow-auto p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Canned replies</h3>
          <button onClick={onClose} className="text-slate-500 text-sm">Close</button>
        </div>

        <div className="mt-3 space-y-3">
          {canned.map((c) => (
            <div key={c.id} className="p-3 border rounded hover:bg-slate-50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-slate-800">{c.title}</div>
                  <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{c.body}</div>
                </div>
                <div className="ml-3 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      onInsert(c.body);
                      onClose();
                    }}
                    className="text-sm px-3 py-1 rounded bg-sky-600 text-white"
                  >
                    Insert
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const defaultCanned: Canned[] = [
  { id: "1", title: "Welcome + Next steps", body: "Thanks for reaching out — here's what to try next: 1) clear cache 2) re-run ingest 3) send logs." },
  { id: "2", title: "Request more info", body: "Could you share the ingest job ID and the manifest URL? Also send the timestamp of the failure." },
  { id: "3", title: "Escalate to engineering", body: "I've escalated this to engineering with priority. We'll update you within 24 hours." },
];
