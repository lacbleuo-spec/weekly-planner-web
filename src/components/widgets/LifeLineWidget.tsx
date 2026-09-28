import { X } from 'lucide-react';

import { useDict } from '../../i18n';
import { usePlanningStore } from '../../store/usePlanningStore';
import { AddRow } from '../ui/AddRow';

export function LifeLineWidget() {
  const dict = useDict();
  const lifeLines = usePlanningStore((s) => s.lifeLines);
  const addLifeLine = usePlanningStore((s) => s.addLifeLine);
  const deleteLifeLine = usePlanningStore((s) => s.deleteLifeLine);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {lifeLines.length === 0 && (
          <p className="text-[13px] text-faint">{dict.widgets.lifeLine.empty}</p>
        )}
        {lifeLines.map((item) => (
          <div key={item.id} className="group flex items-center justify-between gap-2 py-1.5">
            <span className="flex-1 text-[14px] text-ink">{item.title}</span>
            <button
              onClick={() => deleteLifeLine(item.id)}
              aria-label={dict.common.delete}
              className="text-faint opacity-0 transition hover:text-danger group-hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <AddRow placeholder={dict.widgets.lifeLine.addPlaceholder} onSubmit={addLifeLine} />
    </div>
  );
}
