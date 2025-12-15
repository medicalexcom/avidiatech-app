"use client";

import React, { useEffect, useRef } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onClose?: () => void; // alias - optional
};

export function ConfirmDialog({
  open,
  title = "Confirm",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  onClose,
}: ConfirmDialogProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const firstButtonRef = useRef<HTMLButtonElement | null>(null);
  const lastButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // focus the container so screen readers announce the dialog
    containerRef.current?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        (onClose ?? onCancel)?.();
      } else if (e.key === "Tab") {
        // basic tab trapping between first and last button
        const focusable = containerRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          (last as HTMLElement).focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          (first as HTMLElement).focus();
        }
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      tabIndex={-1}
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="fixed inset-0 bg-black/40" onClick={() => (onClose ?? onCancel)?.()} />
      <div className="bg-white rounded shadow-lg max-w-lg w-full p-6 relative z-10">
        <h2 id="confirm-title" className="text-lg font-medium">{title}</h2>
        {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
        <div className="mt-4 flex justify-end gap-3">
          <button
            ref={firstButtonRef}
            onClick={() => (onClose ?? onCancel)?.()}
            className="px-3 py-1 rounded bg-gray-100"
          >
            {cancelLabel}
          </button>
          <button
            ref={lastButtonRef}
            onClick={onConfirm}
            className="px-3 py-1 rounded bg-red-600 text-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
