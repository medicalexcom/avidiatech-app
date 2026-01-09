import React, { useState } from "react";
import ConnectorDetailsDrawer from "@/components/connectors/ConnectorDetailsDrawer";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/toast";

type Props = {
  integration: {
    id: string;
    provider?: string;
    name?: string;
    // optional platform indicates ecommerce connection row
    platform?: string;
  };
  onDeleted?: (id: string) => void;
  onSynced?: (id: string) => void;
};

const ECOMMERCE_PLATFORMS = new Set(["bigcommerce", "shopify", "woocommerce", "magento", "squarespace"]);

const IntegrationRow: React.FC<Props> = ({ integration, onDeleted, onSynced }) => {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const isEcommerce = Boolean(integration.platform && ECOMMERCE_PLATFORMS.has(integration.platform));

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

  return (
    <div className="flex items-center justify-between py-2 border-b">
      <div>
        <div className="font-medium">{integration.name ?? integration.id}</div>
        <div className="text-sm text-gray-500">{integration.provider ?? integration.platform}</div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label={`Open details for ${integration.name ?? integration.id}`}
          className="px-3 py-1 rounded border text-sm hover:bg-gray-50"
        >
          Details
        </button>

        <button
          onClick={async () => {
            setLoading(true);
            try {
              const res = await fetch(`/api/v1/integrations/${integration.id}/sync`, {
                method: "POST",
                credentials: "same-origin",
              });
              const data = await res.json().catch(() => null);
              if (!res.ok || !data?.ok) throw new Error(data?.error || data?.message || "Sync failed");
              toast.success("Sync queued");
              onSynced?.(integration.id);
            } catch (err: any) {
              toast.error(String(err?.message ?? err));
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          aria-label={`Sync now ${integration.name ?? integration.id}`}
          className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-60"
        >
          {loading ? "Syncing…" : "Sync"}
        </button>

        <button
          onClick={() => setConfirmOpen(true)}
          aria-label={`Delete ${integration.name ?? integration.id}`}
          className="px-3 py-1 rounded border text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>

      <ConnectorDetailsDrawer integrationId={integration.id} isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} />

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        title={isEcommerce ? "Disconnect store" : "Delete integration"}
        description={
          isEcommerce
            ? `Disconnect store ${integration.name ?? integration.id}? This will remove stored credentials but you can reconnect later.`
            : `Delete integration ${integration.name ?? integration.id}? This cannot be undone.`
        }
        onConfirm={async () => {
          setConfirmOpen(false);
          try {
            const data = await callDelete();
            toast.success(isEcommerce ? "Store disconnected" : "Integration deleted");
            onDeleted?.(integration.id);
          } catch (err: any) {
            toast.error(String(err?.message ?? err));
          }
        }}
      />
    </div>
  );
};

export default IntegrationRow;
