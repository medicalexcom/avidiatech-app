"use client";

import React, { useState, useRef } from "react";
import ConnectorDetailsDrawer from "@/components/connectors/ConnectorDetailsDrawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/toast";

/**
 * IntegrationRow
 * - Renders a single integration / ecommerce connection row
 * - Replaces separate top-level buttons with an Actions dropdown:
 *    - Test connection
 *    - Sync
 *    - Details
 *    - Delete
 *
 * Behavior:
 * - For ecommerce rows (integration.platform present and known ecommerce provider) prefers ecommerce endpoints:
 *    - Validate: GET  /api/v1/ecommerce_connections/:id/validate
 *    - Sync:     POST /api/v1/ecommerce_connections/:id/sync
 *    - Delete:   DELETE /api/v1/ecommerce_connections/:id
 * - Falls back to legacy integrations endpoints if ecommerce endpoints return non-OK (or 404):
 *    - Test: POST /api/v1/integrations/:id/test
 *    - Sync: POST /api/v1/integrations/:id/sync
 *    - Delete: DELETE /api/v1/integrations/:id
 *
 * Provides per-action loading state and uses toasts for feedback.
 */

type Props = {
  integration: {
    id: string;
    provider?: string;
    name?: string;
    // optional platform indicates ecommerce connection row
    platform?: string;
  };
  onDeleted?: (id: string) => void;
  onSynced?: (id: string, jobId?: string) => void;
};

const ECOMMERCE_PLATFORMS = new Set(["bigcommerce", "shopify", "woocommerce", "magento", "squarespace"]);

export default function IntegrationRow({ integration, onDeleted, onSynced }: Props) {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isTesting, setTesting] = useState(false);
  const [isSyncing, setSyncing] = useState(false);
  const [isDeleting, setDeleting] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const toast = useToast();
  const actionRef = useRef<HTMLDivElement | null>(null);

  const isEcommerce = Boolean(integration.platform && ECOMMERCE_PLATFORMS.has(integration.platform ?? ""));

  // Close menu on outside click (simple)
  React.useEffect(() => {
    function onBodyClick(e: MouseEvent) {
      if (!actionRef.current) return;
      if (!actionRef.current.contains(e.target as Node)) setActionMenuOpen(false);
    }
    document.addEventListener("click", onBodyClick);
    return () => document.removeEventListener("click", onBodyClick);
  }, []);

  async function handleTest() {
    setTesting(true);
    try {
      // Prefer ecommerce validate endpoint if this is an ecommerce connection
      if (isEcommerce) {
        const url = `/api/v1/ecommerce_connections/${encodeURIComponent(integration.id)}/validate`;
        const res = await fetch(url, { credentials: "same-origin" });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.ok === false) throw new Error(json?.error ?? json?.detail ?? "Validation failed");
          toast.success("Connection validated");
          return;
        }
        // fall through to generic test if ecommerce validate isn't implemented or failed
      }

      // Generic test for integrations
      const testUrl = `/api/v1/integrations/${encodeURIComponent(integration.id)}/test`;
      const res2 = await fetch(testUrl, { method: "POST", credentials: "same-origin" });
      if (!res2.ok) {
        const body = await res2.json().catch(() => null);
        throw new Error(body?.error ?? body?.message ?? `Test failed (${res2.status})`);
      }
      const json2 = await res2.json().catch(() => null);
      if (json2?.ok === false) throw new Error(json2?.error ?? "Test failed");
      toast.success("Connection validated");
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    } finally {
      setTesting(false);
      setActionMenuOpen(false);
    }
  }

  async function handleSync() {
    if (isSyncing) return;
    setSyncing(true);
    try {
      // Prefer ecommerce sync endpoint
      if (isEcommerce) {
        const url = `/api/v1/ecommerce_connections/${encodeURIComponent(integration.id)}/sync`;
        let res = await fetch(url, { method: "POST", credentials: "same-origin" });
        if (!res.ok) {
          // fallback to legacy integrations/:id/sync
          res = await fetch(`/api/v1/integrations/${encodeURIComponent(integration.id)}/sync`, {
            method: "POST",
            credentials: "same-origin",
          });
        }
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error ?? `Sync failed (${res.status})`);
        // Show job id when present
        const jobId = json?.jobId ?? json?.id ?? json?.pipelineRunId ?? null;
        toast.success(jobId ? `Sync queued (job ${jobId})` : "Sync started");
        onSynced?.(integration.id, jobId ?? undefined);
        setActionMenuOpen(false);
        return;
      }

      // Fallback generic integrations sync
      const res2 = await fetch(`/api/v1/integrations/${encodeURIComponent(integration.id)}/sync`, {
        method: "POST",
        credentials: "same-origin",
      });
      const json2 = await res2.json().catch(() => null);
      if (!res2.ok || !json2?.ok) throw new Error(json2?.error ?? `Sync failed (${res2.status})`);
      const jobId2 = json2?.jobId ?? json2?.id ?? json2?.pipelineRunId ?? null;
      toast.success(jobId2 ? `Sync queued (job ${jobId2})` : "Sync started");
      onSynced?.(integration.id, jobId2 ?? undefined);
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    } finally {
      setSyncing(false);
      setActionMenuOpen(false);
    }
  }

  async function callDelete() {
    // choose endpoint based on integration type
    const url = isEcommerce
      ? `/api/v1/ecommerce_connections/${encodeURIComponent(integration.id)}`
      : `/api/v1/integrations/${encodeURIComponent(integration.id)}`;

    const res = await fetch(url, { method: "DELETE", credentials: "same-origin" });
    let data;
    try {
      data = await res.json().catch(() => null);
    } catch {
      data = null;
    }
    if (!res.ok) {
      throw new Error(data?.error || data?.message || `Status ${res.status}`);
    }
    return data;
  }

  async function handleDeleteConfirmed() {
    setDeleting(true);
    try {
      await callDelete();
      toast.success("Connection deleted");
      onDeleted?.(integration.id);
    } catch (err: any) {
      toast.error(String(err?.message ?? err));
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setActionMenuOpen(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between py-2 border-b">
        <div>
          <div className="font-medium">{integration.name ?? integration.id}</div>
          <div className="text-sm text-gray-500">{integration.provider ?? integration.platform}</div>
        </div>

        <div className="flex items-center gap-2 relative" ref={actionRef}>
          {/* Compact status indicator */}
          <div className="text-xs text-slate-500 mr-2">{/* could show status here if passed */}</div>

          {/* Actions dropdown trigger */}
          <button
            onClick={() => setActionMenuOpen((s) => !s)}
            aria-haspopup="menu"
            aria-expanded={actionMenuOpen}
            className="px-3 py-1 rounded border text-sm hover:bg-gray-50"
            aria-label={`Actions for ${integration.name ?? integration.id}`}
          >
            Actions
          </button>

          {/* Small inline Sync button if you still want quick access (optional) */}
          <button
            onClick={() => handleSync()}
            disabled={isSyncing}
            className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
            aria-label={`Sync ${integration.name ?? integration.id}`}
          >
            {isSyncing ? "Syncing…" : "Sync"}
          </button>
        </div>

        {/* Actions menu */}
        {actionMenuOpen && (
          <div
            role="menu"
            className="absolute right-3 top-10 z-50 w-44 rounded border bg-white shadow-md p-2"
            style={{ minWidth: 180 }}
          >
            <div className="flex flex-col gap-1">
              <button
                onClick={handleTest}
                disabled={isTesting}
                className="text-left px-2 py-1 rounded hover:bg-slate-50 text-sm"
                role="menuitem"
              >
                {isTesting ? "Testing…" : "Test connection"}
              </button>

              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="text-left px-2 py-1 rounded hover:bg-slate-50 text-sm"
                role="menuitem"
              >
                {isSyncing ? "Syncing…" : "Sync"}
              </button>

              <button
                onClick={() => {
                  setDrawerOpen(true);
                  setActionMenuOpen(false);
                }}
                className="text-left px-2 py-1 rounded hover:bg-slate-50 text-sm"
                role="menuitem"
              >
                Details
              </button>

              <button
                onClick={() => {
                  setConfirmOpen(true);
                  setActionMenuOpen(false);
                }}
                className="text-left px-2 py-1 rounded text-rose-600 hover:bg-rose-50 text-sm"
                role="menuitem"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        title="Delete connection"
        description={`Delete connection ${integration.name ?? integration.id}? This cannot be undone.`}
        onConfirm={() => handleDeleteConfirmed()}
      />

      {/* Connector details drawer */}
      <ConnectorDetailsDrawer
        integrationId={integration.id}
        isOpen={Boolean(isDrawerOpen)}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
