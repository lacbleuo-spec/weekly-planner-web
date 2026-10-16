import { X } from 'lucide-react';
import { useEffect } from 'react';

import { useDict, withWidgetNames } from '../../i18n';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  const dict = useDict();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const { title, paragraphs } = dict.about;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-card bg-surface shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pb-3 pt-6">
          <h2 className="text-[17px] font-bold leading-6 text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label={dict.common.close}
            className="mt-0.5 shrink-0 text-faint transition hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className={`whitespace-pre-line text-[14px] leading-7 ${
                i === 0 ? '' : 'mt-4'
              } ${p.emphasized ? 'font-bold text-ink' : 'text-subink'}`}
            >
              {withWidgetNames(dict, p.text)}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
