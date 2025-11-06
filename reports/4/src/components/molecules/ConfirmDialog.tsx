import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background-light border border-border-color rounded-lg shadow-xl p-6 w-full max-w-sm mx-4 animate-fade-in" role="dialog" aria-modal="true">
        <h2 className="text-lg font-bold text-text-main mb-2">{title}</h2>
        <p className="text-text-secondary mb-6">{description}</p>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded bg-background-light border border-border-color text-text-main hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={onCancel}
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}; 