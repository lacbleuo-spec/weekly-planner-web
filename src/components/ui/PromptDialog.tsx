import { useEffect, useRef } from 'react';

import { useDict } from '../../i18n';

interface PromptDialogProps {
  open: boolean;
  title: string;
  value: string;
  onChange: (value: string) => void;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PromptDialog({
  open,
  title,
  value,
  onChange,
  confirmLabel,
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const dict = useDict();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [open]);

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
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirm();
          }}
          className="mt-4 w-full rounded-control border border-line bg-canvas px-2.5 py-1.5 text-[15px] text-ink focus:border-accent focus:outline-none"
        />
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-control px-4 py-2.5 text-[15px] font-medium text-subink transition hover:bg-canvas"
          >
            {dict.common.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-control bg-accent px-4 py-2.5 text-[15px] font-semibold text-white transition hover:bg-accent-strong"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
