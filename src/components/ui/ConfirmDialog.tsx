import { useDict } from '../../i18n';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dict = useDict();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-card bg-surface p-6 shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[17px] font-bold text-ink">{title}</h2>
        <p className="mt-2 text-[14px] leading-6 text-subink">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-control px-4 py-2.5 text-[15px] font-medium text-subink transition hover:bg-canvas"
          >
            {dict.common.cancel}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-control px-4 py-2.5 text-[15px] font-semibold text-white transition ${
              destructive ? 'bg-danger hover:opacity-90' : 'bg-accent hover:bg-accent-strong'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
