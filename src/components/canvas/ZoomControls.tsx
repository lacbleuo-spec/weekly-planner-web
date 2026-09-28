import { Minus, Plus, RotateCcw } from 'lucide-react';

import { useDict } from '../../i18n';

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ZoomControls({ scale, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  const dict = useDict();

  return (
    <div className="absolute bottom-6 left-6 z-10 flex items-center gap-0.5 rounded-full bg-surface px-1.5 py-1.5 shadow-card">
      <button
        onClick={onZoomOut}
        aria-label={dict.zoom.zoomOut}
        className="flex h-8 w-8 items-center justify-center rounded-full text-subink transition hover:bg-canvas"
      >
        <Minus size={16} />
      </button>
      <button
        onClick={onReset}
        aria-label={dict.zoom.reset}
        className="min-w-[44px] px-1 text-center text-[12px] font-medium text-subink transition hover:text-ink"
      >
        {Math.round(scale * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        aria-label={dict.zoom.zoomIn}
        className="flex h-8 w-8 items-center justify-center rounded-full text-subink transition hover:bg-canvas"
      >
        <Plus size={16} />
      </button>
      <div className="mx-1 h-4 w-px bg-line" />
      <button
        onClick={onReset}
        aria-label={dict.zoom.reset}
        className="flex h-8 w-8 items-center justify-center rounded-full text-subink transition hover:bg-canvas"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}
