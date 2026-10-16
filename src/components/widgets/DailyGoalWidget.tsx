import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Pencil, X } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';

import { useDict } from '../../i18n';
import { addDays, formatDate, formatDateLabel, startOfDay } from '../../lib/date';
import { usePlanningStore } from '../../store/usePlanningStore';
import { AddRow } from '../ui/AddRow';

export function DailyGoalWidget() {
  const dict = useDict();
  const [dayOffset, setDayOffset] = useState(0);
  const day = useMemo(() => addDays(startOfDay(new Date()), dayOffset), [dayOffset]);
  const date = useMemo(() => formatDate(day), [day]);

  const dailyGoals = usePlanningStore((s) => s.dailyGoals);
  const addDailyGoal = usePlanningStore((s) => s.addDailyGoal);
  const updateDailyGoal = usePlanningStore((s) => s.updateDailyGoal);
  const moveDailyGoal = usePlanningStore((s) => s.moveDailyGoal);
  const toggleDailyGoalDone = usePlanningStore((s) => s.toggleDailyGoalDone);
  const deleteDailyGoal = usePlanningStore((s) => s.deleteDailyGoal);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const items = dailyGoals.filter((g) => g.date === date);

  const startEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditValue(title);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (editingId && trimmed) updateDailyGoal(editingId, trimmed);
    setEditingId(null);
  };

  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditingId(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1.5 flex items-center justify-between text-subink">
        <button
          onClick={() => setDayOffset((o) => o - 1)}
          aria-label={dict.date.prevDay}
          className="hover:text-accent"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-[12px] font-medium">{formatDateLabel(day, dict.date)}</span>
        <button
          onClick={() => setDayOffset((o) => o + 1)}
          aria-label={dict.date.nextDay}
          className="hover:text-accent"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 && (
          <p className="text-[13px] text-faint">{dict.widgets.dailyGoal.empty}</p>
        )}
        {items.map((g, index) => (
          <div key={g.id} className="group flex items-center justify-between gap-2 py-1.5">
            {editingId === g.id ? (
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={onEditKeyDown}
                onBlur={commitEdit}
                autoFocus
                onFocus={(e) => e.target.select()}
                className="min-w-0 flex-1 bg-transparent text-[14px] text-ink focus:outline-none"
              />
            ) : (
              <button
                onClick={() => toggleDailyGoalDone(g.id)}
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
            )}
            <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => moveDailyGoal(g.id, 'up')}
                disabled={index === 0}
                aria-label={dict.common.moveUp}
                className="text-faint hover:text-accent disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => moveDailyGoal(g.id, 'down')}
                disabled={index === items.length - 1}
                aria-label={dict.common.moveDown}
                className="text-faint hover:text-accent disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronDown size={14} />
              </button>
              <button
                onClick={() => startEdit(g.id, g.title)}
                aria-label={dict.common.edit}
                className="text-faint hover:text-accent"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => deleteDailyGoal(g.id)}
                aria-label={dict.common.delete}
                className="text-faint hover:text-danger"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <AddRow
        placeholder={dict.widgets.dailyGoal.addPlaceholder}
        onSubmit={(title) => addDailyGoal(date, title)}
      />
    </div>
  );
}
