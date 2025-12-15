"use client";

import React, { useEffect, useState } from "react";

type Integration = {
  id: string;
  provider?: string;
  name?: string;
  created_at?: string;
  config?: Record<string, any>;
  schedule?: any;
};

interface Props {
  integrationId?: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Minimal drawer to show integration/connector details.
 * - Client component — fetches /api/v1/integrations/:id when opened.
 * - Lightweight UI using Tailwind utility classes commonly present in the project.
 * - You can expand actions (Sync now, Edit) to call your existing endpoints.
 */
const ConnectorDetailsDrawer: React.FC<Props> = ({ integrationId, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !integrationId) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/v1/integrations/${integrationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        if (!data.ok) {
          setError(data.error ?? "Failed to load integration");
          setIntegration(null);
        } else {
          setIntegration(data.integration ?? data); // support both shapes
        }
      })
      .catch((e) => {
        if (!mounted) return;
        setError(String(e));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, integrationId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <aside className="ml-auto w-full max-w-lg bg-white dark:bg-slate-900 shadow-xl p-6 overflow-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Connector details</h2>
            <p className="text-sm text-gray-500">Inspect and run actions for this connector.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-4 rounded p-1 text-gray-600 hover:text-gray-900"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : error ? (
          <div className="text-sm text-red-600">Error: {error}</div>
        ) : integration ? (
          <>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                Provider: <strong className="text-gray-800">{integration.provider ?? "—"}</strong>
              </div>
              <div className="text-sm text-gray-600">
                Name: <strong className="text-gray-800">{integration.name ?? integration.id}</strong>
              </div>
              <div className="text-sm text-gray-600">
                Created: <strong className="text-gray-800">{integration.created_at ?? "—"}</strong>
              </div>
            </div>

            <section className="mt-4">
              <h3 className="font-medium mb-2">Configuration</h3>
              <pre className="text-xs bg-gray-100 dark:bg-slate-800 p-3 rounded max-h-44 overflow-auto">
                {JSON.stringify(integration.config ?? {}, null, 2)}
              </pre>
            </section>

            <section className="mt-4">
              <h3 className="font-medium mb-2">Schedule</h3>
              {integration.schedule ? (
                <pre className="text-sm bg-gray-50 dark:bg-slate-800 p-2 rounded">
                  {JSON.stringify(integration.schedule, null, 2)}
                </pre>
              ) : (
                <div className="text-sm text-gray-500">No schedule configured</div>
              )}
            </section>

            <div className="mt-6 flex gap-2">
              <button
                onClick={async () => {
                  try {
                    // Trigger sync via API — adapt endpoint if different
                    if (!integration?.id) return;
                    await fetch(`/api/v1/integrations/${integration.id}/sync`, {
                      method: "POST",
                    });
                    // simple toast or UI feedback could be added
                  } catch (e) {
                    console.error("Sync failed", e);
                    // show user feedback in your real app
                  }
                }}
                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
              >
                Sync now
              </button>

              <a
                href={`/integrations/${integration.id}/edit`}
                className="px-4 py-2 rounded border text-sm text-gray-700 hover:bg-gray-50"
              >
                Edit
              </a>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-500">No integration selected</div>
        )}
      </aside>
    </div>
  );
};

export default ConnectorDetailsDrawer;
