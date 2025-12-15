import React from "react";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title = "Confirm", description, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded shadow-lg max-w-lg w-full p-6">
        <h2 id="confirm-title" className="text-lg font-medium">{title}</h2>
        {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onCancel} className="px-3 py-1 rounded bg-gray-100">{cancelLabel}</button>
          <button onClick={onConfirm} className="px-3 py-1 rounded bg-red-600 text-white">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
