import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useDict } from '../../i18n';
import { addWeeks, formatWeekRange, getWeekId, startOfWeek } from '../../lib/date';
import { usePlanningStore } from '../../store/usePlanningStore';
import { AddRow } from '../ui/AddRow';

export function WeeklyGoalWidget() {
  const dict = useDict();
  const [weekOffset, setWeekOffset] = useState(0);
  const monday = useMemo(() => addWeeks(startOfWeek(new Date()), weekOffset), [weekOffset]);
  const weekId = useMemo(() => getWeekId(monday), [monday]);

  const weeklyGoals = usePlanningStore((s) => s.weeklyGoals);
  const addWeeklyGoal = usePlanningStore((s) => s.addWeeklyGoal);
  const toggleWeeklyGoalDone = usePlanningStore((s) => s.toggleWeeklyGoalDone);
  const deleteWeeklyGoal = usePlanningStore((s) => s.deleteWeeklyGoal);

  const items = weeklyGoals.filter((g) => g.weekId === weekId);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1.5 flex items-center justify-between text-subink">
        <button onClick={() => setWeekOffset((o) => o - 1)} className="hover:text-accent">
          <ChevronLeft size={16} />
        </button>
        <span className="text-[12px] font-medium">{formatWeekRange(monday)}</span>
        <button onClick={() => setWeekOffset((o) => o + 1)} className="hover:text-accent">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 && (
          <p className="text-[13px] text-faint">{dict.widgets.weeklyGoal.empty}</p>
        )}
        {items.map((g) => (
          <div key={g.id} className="group flex items-center justify-between gap-2 py-1.5">
            <button
              onClick={() => toggleWeeklyGoalDone(g.id)}
              className="flex flex-1 items-center gap-2 text-left"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  g.done ? 'border-accent bg-accent text-white' : 'border-line text-transparent'
                }`}
              >
                <Check size={11} strokeWidth={3} />
              </span>
              <span
                className={`flex-1 text-[14px] ${g.done ? 'text-faint line-through' : 'text-ink'}`}
              >
                {g.title}
              </span>
            </button>
            <button
              onClick={() => deleteWeeklyGoal(g.id)}
              aria-label={dict.common.delete}
              className="text-faint opacity-0 transition hover:text-danger group-hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <AddRow
        placeholder={dict.widgets.weeklyGoal.addPlaceholder}
        onSubmit={(title) => addWeeklyGoal(weekId, title)}
      />
    </div>
  );
}
