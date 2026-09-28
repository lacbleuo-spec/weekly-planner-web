import { X } from 'lucide-react';

import { useDict } from '../../i18n';
import { usePlanningStore } from '../../store/usePlanningStore';
import { AddRow } from '../ui/AddRow';

export function TopGoalWidget() {
  const dict = useDict();
  const topGoals = usePlanningStore((s) => s.topGoals);
  const addTopGoal = usePlanningStore((s) => s.addTopGoal);
  const deleteTopGoal = usePlanningStore((s) => s.deleteTopGoal);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {topGoals.length === 0 && (
          <p className="text-[13px] text-faint">{dict.widgets.topGoal.empty}</p>
        )}
        {topGoals.map((g) => (
          <div key={g.id} className="group flex items-center justify-between gap-2 py-1.5">
            <span className="flex-1 text-[14px] text-ink">{g.title}</span>
            <button
              onClick={() => deleteTopGoal(g.id)}
              aria-label={dict.common.delete}
              className="text-faint opacity-0 transition hover:text-danger group-hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <AddRow placeholder={dict.widgets.topGoal.addPlaceholder} onSubmit={addTopGoal} />
    </div>
  );
}
