import React, { useState } from "react";
import ConnectorDetailsDrawer from "@/components/connectors/ConnectorDetailsDrawer";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import toast from "@/components/ui/toast";

type Props = {
  integration: {
    id: string;
    provider?: string;
    name?: string;
  };
  onDeleted?: (id: string) => void;
  onSynced?: (id: string) => void;
};

const IntegrationRow: React.FC<Props> = ({ integration, onDeleted, onSynced }) => {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex items-center justify-between py-2 border-b">
      <div>
        <div className="font-medium">{integration.name ?? integration.id}</div>
        <div className="text-sm text-gray-500">{integration.provider}</div>
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
              const res = await fetch(`/api/v1/integrations/${integration.id}/sync`, { method: "POST" });
              const data = await res.json();
              if (!data.ok) throw new Error(data.error || "Sync failed");
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
        onClose={() => setConfirmOpen(false)}
        title="Delete integration"
        description={`Delete integration ${integration.name ?? integration.id}? This cannot be undone.`}
        onConfirm={async () => {
          try {
            const res = await fetch(`/api/v1/integrations/${integration.id}`, { method: "DELETE" });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error || "Delete failed");
            toast.success("Integration deleted");
            onDeleted?.(integration.id);
          } catch (err: any) {
            toast.error(String(err?.message ?? err));
          } finally {
            setConfirmOpen(false);
          }
        }}
      />
    </div>
  );
};

export default IntegrationRow;
