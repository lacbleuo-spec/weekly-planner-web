import { Check, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useDict } from '../../i18n';
import { addDays, formatDate, formatDateLabel, getWeekId } from '../../lib/date';
import { usePlanningStore } from '../../store/usePlanningStore';

export function DailyGoalWidget() {
  const dict = useDict();
  const [dayOffset, setDayOffset] = useState(0);
  const date = useMemo(() => addDays(new Date(), dayOffset), [dayOffset]);
  const dateKey = formatDate(date);
  const weekId = getWeekId(date);

  const weeklyGoals = usePlanningStore((s) => s.weeklyGoals);
  const dailyAssignments = usePlanningStore((s) => s.dailyAssignments);
  const assignDailyGoal = usePlanningStore((s) => s.assignDailyGoal);
  const toggleDailyAssignmentDone = usePlanningStore((s) => s.toggleDailyAssignmentDone);
  const unassignDailyGoal = usePlanningStore((s) => s.unassignDailyGoal);

  const assignmentsToday = dailyAssignments.filter((a) => a.date === dateKey);
  const assignedGoalIds = new Set(assignmentsToday.map((a) => a.weeklyGoalId));
  const weekGoals = weeklyGoals.filter((g) => g.weekId === weekId);
  const unassignedThisWeek = weekGoals.filter((g) => !assignedGoalIds.has(g.id));

  const goalTitle = (id: string) =>
    weeklyGoals.find((g) => g.id === id)?.title ?? dict.widgets.dailyGoal.deletedItem;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1.5 flex items-center justify-between text-subink">
        <button onClick={() => setDayOffset((o) => o - 1)} className="hover:text-accent">
          <ChevronLeft size={16} />
        </button>
        <span className="text-[12px] font-medium">
          {formatDateLabel(date, dict.date.weekdaysShort)}
        </span>
        <button onClick={() => setDayOffset((o) => o + 1)} className="hover:text-accent">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {assignmentsToday.length === 0 && (
          <p className="mb-2 text-[13px] text-faint">{dict.widgets.dailyGoal.empty}</p>
        )}
        {assignmentsToday.map((a) => (
          <div key={a.id} className="group flex items-center justify-between gap-2 py-1.5">
            <button
              onClick={() => toggleDailyAssignmentDone(a.id)}
              className="flex flex-1 items-center gap-2 text-left"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  a.done ? 'border-accent bg-accent text-white' : 'border-line text-transparent'
                }`}
              >
                <Check size={11} strokeWidth={3} />
              </span>
              <span
                className={`flex-1 text-[14px] ${a.done ? 'text-faint line-through' : 'text-ink'}`}
              >
                {goalTitle(a.weeklyGoalId)}
              </span>
            </button>
            <button
              onClick={() => unassignDailyGoal(a.id)}
              aria-label={dict.widgets.dailyGoal.exclude}
              className="text-faint opacity-0 transition hover:text-danger group-hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {unassignedThisWeek.length > 0 && (
          <div className="mt-2 border-t border-line pt-2">
            <p className="mb-1 text-[11px] text-faint">{dict.widgets.dailyGoal.fromWeek}</p>
            {unassignedThisWeek.map((g) => (
              <button
                key={g.id}
                onClick={() => assignDailyGoal(g.id, dateKey)}
                className="flex w-full items-center justify-between gap-2 rounded-control py-1 text-left"
              >
                <span className="flex-1 text-[13px] text-ink">{g.title}</span>
                <span className="flex items-center gap-0.5 text-[11px] font-medium text-accent">
                  <Plus size={11} />
                  {dict.widgets.dailyGoal.addToday}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
