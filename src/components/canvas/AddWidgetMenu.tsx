import { Plus } from 'lucide-react';
import { useState } from 'react';

import { useDict } from '../../i18n';
import { usePlanningStore } from '../../store/usePlanningStore';
import { useCanvasFocusStore } from '../../store/useCanvasFocusStore';
import type { WidgetType } from '../../types/planning';
import { WIDGET_ICONS, WIDGET_ORDER } from '../widgets/meta';

export function AddWidgetMenu() {
  const dict = useDict();
  const [open, setOpen] = useState(false);
  const widgets = usePlanningStore((s) => s.widgets);
  const addWidget = usePlanningStore((s) => s.addWidget);
  const bringToFront = usePlanningStore((s) => s.bringToFront);
  const focusWidget = useCanvasFocusStore((s) => s.focusWidget);

  // 위젯마다 캔버스 전체의 데이터를 하나의 화면에서 보여주므로, 같은 종류를 두 개 이상
  // 만들 이유가 없다. 이미 캔버스에 있는 종류를 다시 누르면 새로 추가하는 대신
  // 그 위젯으로 화면을 이동한다.
  const handleAdd = (type: WidgetType) => {
    const existing = widgets.find((w) => w.type === type);
    if (existing) {
      bringToFront(existing.id);
      focusWidget(existing.id);
    } else {
      addWidget(type);
    }
    setOpen(false);
  };

  return (
    <div className="absolute bottom-6 right-6 z-10">
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-16 right-0 z-20 w-64 overflow-hidden rounded-card bg-surface py-2 shadow-float">
            <p className="px-4 py-1.5 text-[12px] font-semibold text-faint">
              {dict.widgetMenu.heading}
            </p>
            {WIDGET_ORDER.map((type) => {
              const Icon = WIDGET_ICONS[type];
              const meta = dict.widgets[type];
              return (
                <button
                  key={type}
                  onClick={() => handleAdd(type)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-canvas"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <Icon size={16} strokeWidth={2.25} />
                  </span>
                  <span className="min-w-0 truncate text-[14px] font-semibold text-ink">
                    {meta.title}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={dict.widgetMenu.open}
        className="relative z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-float transition hover:bg-accent-strong active:scale-95"
      >
        <Plus size={26} className={`transition-transform ${open ? 'rotate-45' : ''}`} />
      </button>
    </div>
  );
}
